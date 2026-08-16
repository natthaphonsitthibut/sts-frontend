import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getApiErrorMessage } from "../../../lib/api-error";
import type {
  AttendanceMark,
  AttendanceSelectionStatus,
} from "../types/attendance.types";

type RecordableStatus = Exclude<AttendanceSelectionStatus, "NONE">;

/** Quiet period after the last tap before a flush goes out. */
const FLUSH_DEBOUNCE_MS = 2_000;
/** Ceiling so a teacher tapping non-stop still gets periodic saves. */
const FLUSH_MAX_WAIT_MS = 10_000;
const RETRY_BACKOFF_MS = [2_000, 5_000, 15_000] as const;

export type AutosaveState = "idle" | "saving" | "saved" | "error" | "blocked";

export interface AttendanceMarksTransport {
  /**
   * Persists the given marks as a draft. `mark: null` means the teacher took the
   * status back and the stored row must be removed. Must reject on failure.
   */
  saveMarks: (
    marks: Array<{ studentId: string; mark: AttendanceMark | null }>,
  ) => Promise<void>;
}

/**
 * Retrying only helps when the failure is transient. A rejected round
 * (submitted/voided/off-calendar), a student outside the roster or a malformed
 * payload will fail identically forever, so the loop stops and the teacher is
 * told the real reason instead of watching "ลองใหม่" never work.
 */
function isRetryableFailure(error: unknown): boolean {
  // Guest-link calls strip the Axios error to keep the token out of memory and
  // re-expose the code as `status`, so both shapes have to be read here.
  const shaped = error as
    | { response?: { status?: number }; status?: number }
    | undefined;
  const status = shaped?.response?.status ?? shaped?.status;
  if (status === undefined) return true; // network/timeout — no response at all
  if (status === 408 || status === 429) return true;
  return status >= 500;
}

interface UseAttendanceMarksOptions {
  /** Marks already stored server-side for this round. */
  serverMarks: Readonly<Record<string, AttendanceMark>>;
  /** Every student who must be marked before the round can be submitted. */
  rosterIds: readonly string[];
  /** Identifies the round; changing it flushes pending work and resets state. */
  sessionKey: string;
  transport: AttendanceMarksTransport;
  /** Autosave and editing are both off once the round is closed. */
  enabled: boolean;
}

function readPersisted(sessionKey: string): Record<string, AttendanceMark | null> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.sessionStorage.getItem(`attendance-draft:${sessionKey}`);
    return raw ? (JSON.parse(raw) as Record<string, AttendanceMark | null>) : {};
  } catch {
    return {};
  }
}

function writePersisted(
  sessionKey: string,
  pending: Record<string, AttendanceMark | null>,
): void {
  if (typeof window === "undefined") return;
  const key = `attendance-draft:${sessionKey}`;
  try {
    if (Object.keys(pending).length === 0) window.sessionStorage.removeItem(key);
    else window.sessionStorage.setItem(key, JSON.stringify(pending));
  } catch {
    // Private-mode or quota failures must never block check-in; the marks still
    // live in React state and flush normally.
  }
}

/**
 * Holds a check-in in progress and keeps it saved without a save button.
 *
 * Marks land in local state on tap (so the UI never waits on the network) and
 * are flushed as a debounced batch. Nothing is defaulted: a student the teacher
 * has not touched has no mark at all, which is what lets the caller tell
 * "ยังไม่เช็ก" apart from "มา" and block submit until the class is complete.
 *
 * Unsent marks are mirrored into sessionStorage, so a refresh or a crash mid
 * class does not silently lose taps the UI already showed as recorded.
 */
export function useAttendanceMarks({
  serverMarks,
  rosterIds,
  sessionKey,
  transport,
  enabled,
}: UseAttendanceMarksOptions) {
  // `null` is a tombstone: the teacher cleared this student locally. Without it
  // the merge below would let the still-stored server mark reappear.
  const [localMarks, setLocalMarks] = useState<Record<string, AttendanceMark | null>>(
    () => readPersisted(sessionKey),
  );
  const [localSessionKey, setLocalSessionKey] = useState(sessionKey);
  const [previousMarks, setPreviousMarks] = useState<Record<
    string,
    AttendanceMark
  > | null>(null);
  const [autosaveState, setAutosaveState] = useState<AutosaveState>("idle");
  const [failureMessage, setFailureMessage] = useState<string | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);

  // Refs hold flush machinery so re-renders never restart a timer or race a
  // request; React state only carries what the UI actually paints. Pending work
  // is seeded from storage so marks unsent before a reload still go out.
  const pendingRef = useRef<Record<string, AttendanceMark | null>>(
    readPersisted(sessionKey),
  );
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const maxWaitRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlightRef = useRef<Promise<void> | null>(null);
  const retryRef = useRef(0);
  const transportRef = useRef(transport);
  const sessionKeyRef = useRef(sessionKey);

  const clearTimers = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (maxWaitRef.current) clearTimeout(maxWaitRef.current);
    debounceRef.current = null;
    maxWaitRef.current = null;
  }, []);

  // Retry re-enters flush, so the callback reaches itself through a ref rather
  // than referencing its own binding before it exists.
  const flushRef = useRef<() => Promise<void>>(async () => undefined);

  const flush = useCallback(async (): Promise<void> => {
    clearTimers();
    // Capture the round and its transport before waiting. A class/date change
    // can happen while an earlier request is in flight; using mutable refs
    // after that wait would send the old batch to the new round.
    const activeSessionKey = sessionKeyRef.current;
    const activeTransport = transportRef.current;
    const batch = Object.entries(pendingRef.current);
    if (batch.length === 0) {
      await inFlightRef.current?.catch(() => undefined);
      return;
    }

    pendingRef.current = {};
    writePersisted(activeSessionKey, {});
    setAutosaveState("saving");
    const previousInFlight = inFlightRef.current;
    const run = Promise.resolve()
      .then(async () => {
        // Serialise requests so a newer batch cannot land before an older one.
        await previousInFlight?.catch(() => undefined);
        await activeTransport.saveMarks(
          batch.map(([studentId, mark]) => ({ studentId, mark })),
        );
      })
      .then(() => {
        if (sessionKeyRef.current !== activeSessionKey) return;
        retryRef.current = 0;
        setFailureMessage(null);
        setAutosaveState("saved");
        setLastSavedAt(new Date().toISOString());
      })
      .catch((error: unknown) => {
        // Put the batch back without clobbering newer marks. If the user has
        // already switched rounds, persist it under the old key rather than
        // contaminating the new round's in-memory queue.
        const currentSessionIsActive = sessionKeyRef.current === activeSessionKey;
        if (currentSessionIsActive) {
          pendingRef.current = Object.fromEntries([
            ...batch,
            ...Object.entries(pendingRef.current),
          ]);
          writePersisted(activeSessionKey, pendingRef.current);
        } else {
          const persisted = readPersisted(activeSessionKey);
          writePersisted(
            activeSessionKey,
            // The captured batch was queued after any earlier in-flight batch,
            // so it wins when both contain the same student.
            Object.fromEntries([...Object.entries(persisted), ...batch]),
          );
          return;
        }
        setFailureMessage(
          getApiErrorMessage(error, "บันทึกอัตโนมัติไม่สำเร็จ กรุณาลองใหม่"),
        );
        if (!isRetryableFailure(error)) {
          // Permanent: stop the loop and let the UI ask the teacher to reload,
          // rather than offering a retry that can never succeed.
          setAutosaveState("blocked");
          retryRef.current = 0;
          throw error;
        }
        setAutosaveState("error");
        const delay =
          RETRY_BACKOFF_MS[Math.min(retryRef.current, RETRY_BACKOFF_MS.length - 1)];
        retryRef.current += 1;
        debounceRef.current = setTimeout(() => void flushRef.current(), delay);
        throw error;
      })
      .finally(() => {
        if (inFlightRef.current === run) inFlightRef.current = null;
      });
    inFlightRef.current = run;
    await run.catch(() => undefined);
  }, [clearTimers]);

  useEffect(() => {
    flushRef.current = flush;
  }, [flush]);

  const scheduleFlush = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => void flush(), FLUSH_DEBOUNCE_MS);
    if (!maxWaitRef.current) {
      maxWaitRef.current = setTimeout(() => void flush(), FLUSH_MAX_WAIT_MS);
    }
  }, [flush]);

  const queue = useCallback(
    (next: Record<string, AttendanceMark | null>, changed: string[]) => {
      for (const studentId of changed) {
        // `null` tells the transport to delete the stored row for a student the
        // teacher un-marked; anything else is an upsert.
        pendingRef.current[studentId] = next[studentId] ?? null;
      }
      writePersisted(sessionKeyRef.current, pendingRef.current);
      scheduleFlush();
    },
    [scheduleFlush],
  );

  // Switching class/date/period: snapshot and flush the old round with its old
  // transport, then activate the new queue immediately. A failed old flush
  // stays under the old sessionStorage key for the next visit.
  useEffect(() => {
    if (sessionKeyRef.current === sessionKey) {
      transportRef.current = transport;
      return;
    }
    void flush();
    sessionKeyRef.current = sessionKey;
    transportRef.current = transport;
    const restored = readPersisted(sessionKey);
    pendingRef.current = restored;
    setLocalMarks(restored);
    setLocalSessionKey(sessionKey);
    setPreviousMarks(null);
    setAutosaveState("idle");
    setFailureMessage(null);
    setLastSavedAt(null);
    retryRef.current = 0;
  }, [flush, sessionKey, transport]);

  // Leaving the tab or unmounting must not strand a pending batch.
  useEffect(() => {
    const onHidden = () => {
      if (document.visibilityState === "hidden") void flush();
    };
    document.addEventListener("visibilitychange", onHidden);
    return () => {
      document.removeEventListener("visibilitychange", onHidden);
      void flush();
    };
  }, [flush]);

  const marks = useMemo(() => {
    const merged: Record<string, AttendanceMark> = { ...serverMarks };
    if (localSessionKey !== sessionKey) return merged;
    for (const [studentId, mark] of Object.entries(localMarks)) {
      if (mark === null) delete merged[studentId];
      else merged[studentId] = mark;
    }
    return merged;
  }, [serverMarks, localMarks, localSessionKey, sessionKey]);

  /**
   * Tapping a status sets it; tapping the *same* status again takes it back to
   * "ยังไม่เช็ก". Without that a mis-tap would be unfixable — there is no
   * "no status" pill to press, and clearing has to reach the server or the next
   * prefill would restore the status the teacher just undid.
   */
  const setStatus = useCallback(
    (studentId: string, status: RecordableStatus) => {
      if (!enabled) return;
      const isSameStatus = marks[studentId]?.status === status;
      setPreviousMarks(marks);
      setLocalMarks((current) => {
        const next = { ...current };
        next[studentId] = isSameStatus
          ? null
          : { status, markedAt: new Date().toISOString() };
        queue(next, [studentId]);
        return next;
      });
    },
    [enabled, marks, queue],
  );

  /**
   * Scanner input means "apply this status", unlike a roster-pill tap where a
   * second tap intentionally clears it. Keeping the actions separate prevents
   * an accidental duplicate camera frame from unmarking a student.
   */
  const markStatus = useCallback(
    (studentId: string, status: RecordableStatus) => {
      if (!enabled || marks[studentId]?.status === status) return;
      setPreviousMarks(marks);
      setLocalMarks((current) => {
        const next = {
          ...current,
          [studentId]: { status, markedAt: new Date().toISOString() },
        };
        queue(next, [studentId]);
        return next;
      });
    },
    [enabled, marks, queue],
  );

  /**
   * Fills only the students with no mark yet. Overwriting explicit choices would
   * silently discard the exceptions the teacher just entered, so "มาทั้งหมด"
   * completes the class instead of resetting it.
   */
  const markRemainingPresent = useCallback(() => {
    if (!enabled) return;
    const unmarked = rosterIds.filter((studentId) => !marks[studentId]);
    if (unmarked.length === 0) return;
    // One timestamp for the batch: this is the moment the teacher confirmed the
    // rest of the class was present, which is the honest reading of the tap.
    const markedAt = new Date().toISOString();
    setPreviousMarks(marks);
    setLocalMarks((current) => {
      const next = { ...current };
      for (const studentId of unmarked) {
        next[studentId] = { status: "P_PRESENT", markedAt };
      }
      queue(next, unmarked);
      return next;
    });
  }, [enabled, marks, queue, rosterIds]);

  const undo = useCallback(() => {
    if (!previousMarks) return;
    const restored: Record<string, AttendanceMark | null> = { ...previousMarks };
    for (const studentId of Object.keys(marks)) {
      if (!previousMarks[studentId]) restored[studentId] = null;
    }
    setLocalMarks(restored);
    setPreviousMarks(null);
    // Push every roster student whose mark differs from the snapshot, including
    // those that must now be cleared — queue() turns a missing entry into a delete.
    queue(
      restored,
      rosterIds.filter(
        (studentId) => restored[studentId]?.status !== marks[studentId]?.status,
      ),
    );
  }, [marks, previousMarks, queue, rosterIds]);

  const unmarkedCount = useMemo(
    () => rosterIds.filter((studentId) => !marks[studentId]).length,
    [marks, rosterIds],
  );

  return {
    marks,
    setStatus,
    markStatus,
    markRemainingPresent,
    undo,
    canUndo: previousMarks !== null,
    unmarkedCount,
    markedCount: rosterIds.length - unmarkedCount,
    autosaveState,
    failureMessage,
    lastSavedAt,
    /** Awaited before submit so no tap is left unsaved when the round closes. */
    flush,
    reset: useCallback(() => {
      clearTimers();
      pendingRef.current = {};
      writePersisted(sessionKeyRef.current, {});
      setLocalMarks({});
      setPreviousMarks(null);
      setAutosaveState("idle");
      setFailureMessage(null);
      setLastSavedAt(null);
      retryRef.current = 0;
    }, [clearTimers]),
  };
}
