import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { normalizeCalendarDateKey } from "../../../lib/date-time";
import { checkInService } from "../api/check-in.service";
import type {
  CheckInAccess,
  CheckInMarkStatus,
  CheckInSession,
  LocalCheckInMark,
} from "../types/check-in.types";

const MODE_KEY = "sts_check_in_mode";

function bangkokToday(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function readMode(): "TABLE" | "CARD" {
  if (typeof window === "undefined") return "TABLE";
  return window.localStorage.getItem(MODE_KEY) === "CARD" ? "CARD" : "TABLE";
}

interface UseCheckInWorkspaceInput {
  access: CheckInAccess;
  classroomId?: number;
  initialDate?: string;
  initialClassroomSubjectId?: number;
  /**
   * Fixes the lesson instead of asking for it. A link opens onto one subject's
   * roster — the card the teacher tapped already said which — so the picker
   * would be a question whose answer was given a screen ago.
   */
  classroomSubjectId?: number;
  enabled?: boolean;
}

interface DraftState {
  key: string;
  marks: Map<string, LocalCheckInMark>;
  history: Array<{
    changes: Array<{ studentId: string; previous?: LocalCheckInMark }>;
  }>;
  session: CheckInSession | null;
}

function emptyDraft(key: string): DraftState {
  return { key, marks: new Map(), history: [], session: null };
}

// Marking is interrupted work: a teacher opens a student's profile mid-roll and
// comes back. The draft therefore outlives the component, and sessionStorage is
// the right shelf for it — it belongs to this tab, this session, this device,
// and never travels anywhere.
const DRAFT_KEY_PREFIX = "sts_check_in_draft:";

interface SerializedDraft {
  marks: Array<[string, LocalCheckInMark]>;
  history: DraftState["history"];
  session: CheckInSession | null;
}

function readStoredDraft(key: string): DraftState {
  if (typeof window === "undefined" || !key) return emptyDraft(key);
  try {
    const raw = window.sessionStorage.getItem(`${DRAFT_KEY_PREFIX}${key}`);
    if (!raw) return emptyDraft(key);
    const parsed = JSON.parse(raw) as SerializedDraft;
    return {
      key,
      marks: new Map(parsed.marks ?? []),
      history: parsed.history ?? [],
      session: parsed.session ?? null,
    };
  } catch {
    return emptyDraft(key);
  }
}

function storeDraft(draft: DraftState): void {
  if (typeof window === "undefined" || !draft.key) return;
  try {
    const payload: SerializedDraft = {
      marks: [...draft.marks.entries()],
      history: draft.history,
      session: draft.session,
    };
    window.sessionStorage.setItem(
      `${DRAFT_KEY_PREFIX}${draft.key}`,
      JSON.stringify(payload),
    );
  } catch {
    // A tab with storage blocked still checks attendance; it just cannot leave
    // the page and come back to it.
  }
}

export function useCheckInWorkspace({
  access,
  classroomId,
  classroomSubjectId: fixedSubjectId,
  initialClassroomSubjectId,
  initialDate,
  enabled = true,
}: UseCheckInWorkspaceInput) {
  const queryClient = useQueryClient();
  // A hand-edited or stale `?date=` normalizes to "", which every query would
  // then send as a blank date and get a 400 for. Today is the same answer the
  // page gives with no date at all, so an unreadable one lands there too.
  const [date, setDate] = useState(
    () => normalizeCalendarDateKey(initialDate) || bangkokToday(),
  );
  const [requestedSubjectId, setClassroomSubjectId] = useState<number | null>(
    fixedSubjectId ?? initialClassroomSubjectId ?? null,
  );
  const [mode, setModeState] = useState<"TABLE" | "CARD">(readMode);
  const [draftState, setDraftState] = useState<DraftState>(() =>
    emptyDraft(""),
  );
  const startPromise = useRef<{
    key: string;
    promise: Promise<CheckInSession>;
  } | null>(null);
  const publicAccess = access === "PUBLIC_LINK";
  const canQuery = enabled && (publicAccess || Boolean(classroomId));

  const optionsQuery = useQuery({
    queryKey: ["check-in", access, classroomId ?? null, "options", date],
    queryFn: () => checkInService.getOptions({ access, classroomId, date }),
    enabled: canQuery,
  });
  const subjects = optionsQuery.data?.subjects ?? [];
  // A link opens onto one lesson, so the subject arrives with the room and the
  // teacher never picks it. Nothing in the URL can widen that: the id still has
  // to be one the options list came back with.
  const requested = fixedSubjectId ?? requestedSubjectId;
  const classroomSubjectId = subjects.some(
    (item) => item.classroomSubjectId === requested,
  )
    ? requested
    : null;
  const rosterQuery = useQuery({
    queryKey: [
      "check-in",
      access,
      classroomId ?? null,
      "roster",
      date,
      classroomSubjectId,
    ],
    queryFn: () =>
      checkInService.getRoster({
        access,
        classroomId,
        date,
        classroomSubjectId: classroomSubjectId ?? undefined,
      }),
    enabled: canQuery,
  });
  // The register already open for this lesson, if there is one. Reading it is
  // deliberately separate from `startSession`: opening a lesson to look at it
  // must not freeze a roster and leave an unsubmitted session behind.
  const openSessionQuery = useQuery({
    queryKey: [
      "check-in",
      access,
      classroomId ?? null,
      "session",
      date,
      classroomSubjectId,
    ],
    queryFn: () =>
      checkInService.getCurrentSession({
        access,
        classroomId,
        date,
        classroomSubjectId: classroomSubjectId as number,
      }),
    enabled: canQuery && Boolean(classroomSubjectId),
  });
  const selectionKey = `${access}:${classroomId ?? "public"}:${date}:${classroomSubjectId ?? ""}`;
  // Restoring is keyed by the same selection the draft was written under, so a
  // different day or subject never picks up someone else's marks.
  const restoredDraft = useMemo(
    () => readStoredDraft(selectionKey),
    [selectionKey],
  );
  const localDraft =
    draftState.key === selectionKey ? draftState : restoredDraft;
  // Selecting a lesson shows what is already recorded there — a day that was
  // submitted comes back with its marks so the teacher can correct them. It is
  // derived rather than copied into state by an effect: the moment the teacher
  // touches anything the local draft takes over and this stops applying.
  const draft = useMemo<DraftState>(() => {
    const existing = openSessionQuery.data;
    if (!existing || localDraft.session || !rosterQuery.data) return localDraft;
    if (!existing.hasSubmittedResult) {
      return { ...localDraft, session: existing };
    }
    const exceptions = new Map(
      existing.exceptions.map((item) => [item.studentId, item]),
    );
    return {
      key: selectionKey,
      session: existing,
      history: [],
      marks: new Map(
        rosterQuery.data.map((student) => [
          student.id,
          {
            status: exceptions.get(student.id)?.status ?? "P_PRESENT",
            markedAt: existing.submittedAt ?? existing.checkingStartedAt,
          },
        ]),
      ),
    };
  }, [localDraft, openSessionQuery.data, rosterQuery.data, selectionKey]);
  // Every edit builds on what is on screen: the live state when it belongs to
  // this selection, otherwise the draft restored from this tab or seeded from
  // the register already on the server. Starting from an empty draft instead
  // would drop those marks the moment the teacher touched anything.
  const baseDraft = useCallback(
    (current: DraftState): DraftState =>
      current.key === selectionKey ? current : draft,
    [draft, selectionKey],
  );
  useEffect(() => {
    if (draft.key !== selectionKey) return;
    storeDraft(draft);
  }, [draft, selectionKey]);

  const startMutation = useMutation({
    // Freezing the roster is a side effect of the first mark, not something the
    // teacher asked for, so it must not raise the global "บันทึกแล้ว" toast.
    meta: { suppressSuccessToast: true },
    mutationFn: () => {
      if (!classroomSubjectId) {
        throw new Error("กรุณาเลือกวิชา");
      }
      return checkInService.startSession({
        access,
        classroomId,
        date,
        classroomSubjectId,
      });
    },
  });

  const storeStartedSession = useCallback(
    (result: CheckInSession) => {
      setDraftState((current) => {
        const active = baseDraft(current);
        if (!result.hasSubmittedResult || !rosterQuery.data) {
          return { ...active, session: result };
        }
        const exceptions = new Map(
          result.exceptions.map((item) => [item.studentId, item]),
        );
        return {
          key: selectionKey,
          session: result,
          history: [],
          marks: new Map(
            rosterQuery.data.map((student) => [
              student.id,
              {
                status: exceptions.get(student.id)?.status ?? "P_PRESENT",
                markedAt: result.submittedAt ?? result.checkingStartedAt,
              },
            ]),
          ),
        };
      });
    },
    [baseDraft, rosterQuery.data, selectionKey],
  );

  const ensureStarted = useCallback(async (): Promise<CheckInSession> => {
    if (draft.session) return draft.session;
    if (startPromise.current?.key === selectionKey) {
      return await startPromise.current.promise;
    }
    const pending = startMutation.mutateAsync().then((result) => {
      storeStartedSession(result);
      return result;
    });
    startPromise.current = { key: selectionKey, promise: pending };
    try {
      return await pending;
    } catch (error) {
      if (startPromise.current?.promise === pending)
        startPromise.current = null;
      throw error;
    }
  }, [draft.session, selectionKey, startMutation, storeStartedSession]);

  const mark = useCallback(
    (studentId: string, status: CheckInMarkStatus) => {
      if (draft.session?.readOnly) return;
      const markedAt = new Date().toISOString();
      setDraftState((current) => {
        const active = baseDraft(current);
        const marks = new Map(active.marks);
        const previous = active.marks.get(studentId);
        marks.set(studentId, {
          status,
          markedAt,
        });
        return {
          ...active,
          marks,
          history: [...active.history, { changes: [{ studentId, previous }] }],
        };
      });
      void ensureStarted().catch(() => undefined);
    },
    [baseDraft, draft.session?.readOnly, ensureStarted],
  );

  const undo = useCallback(() => {
    if (draft.session?.readOnly) return;
    setDraftState((current) => {
      const active = baseDraft(current);
      const last = active.history.at(-1);
      if (!last) return active;
      const marks = new Map(active.marks);
      for (const change of last.changes) {
        if (change.previous) marks.set(change.studentId, change.previous);
        else marks.delete(change.studentId);
      }
      return { ...active, marks, history: active.history.slice(0, -1) };
    });
  }, [baseDraft, draft.session?.readOnly]);

  const clear = useCallback(
    (studentId: string) => {
      if (draft.session?.readOnly || !draft.marks.has(studentId)) return;
      setDraftState((current) => {
        const active = baseDraft(current);
        const previous = active.marks.get(studentId);
        if (!previous) return active;
        const marks = new Map(active.marks);
        marks.delete(studentId);
        return {
          ...active,
          marks,
          history: [...active.history, { changes: [{ studentId, previous }] }],
        };
      });
    },
    [baseDraft, draft.marks, draft.session?.readOnly],
  );

  const markRemainingPresent = useCallback(() => {
    if (draft.session?.readOnly) return;
    const roster = rosterQuery.data ?? [];
    const unmarkedIds = roster
      .map((student) => student.id)
      .filter((studentId) => !draft.marks.has(studentId));
    if (unmarkedIds.length === 0) return;
    const markedAt = new Date().toISOString();
    setDraftState((current) => {
      const active = baseDraft(current);
      const marks = new Map(active.marks);
      const changes = unmarkedIds
        .filter((studentId) => !marks.has(studentId))
        .map((studentId) => ({ studentId, previous: marks.get(studentId) }));
      if (changes.length === 0) return active;
      for (const change of changes) {
        marks.set(change.studentId, { status: "P_PRESENT", markedAt });
      }
      return {
        ...active,
        marks,
        history: [...active.history, { changes }],
      };
    });
    void ensureStarted().catch(() => undefined);
  }, [
    baseDraft,
    draft.marks,
    draft.session?.readOnly,
    ensureStarted,
    rosterQuery.data,
  ]);

  const submitMutation = useMutation({
    // CheckInWorkspace reports the precise first-submit/correction outcome.
    // Suppress the generic mutation toast so it does not stack beside it.
    meta: { suppressSuccessToast: true },
    mutationFn: async (correctionReason?: string) => {
      if (!classroomSubjectId) throw new Error("กรุณาเลือกวิชา");
      const roster = rosterQuery.data ?? [];
      if (!roster.length) throw new Error("ห้องเรียนนี้ไม่มีนักเรียน");
      if (draft.marks.size !== roster.length) {
        throw new Error("กรุณาระบุสถานะนักเรียนให้ครบทุกคนก่อนส่ง");
      }
      const activeSession = await ensureStarted();
      const exceptions = [...draft.marks.entries()]
        .filter(([, markValue]) => markValue.status !== "P_PRESENT")
        .map(([studentId, markValue]) => ({
          studentId,
          status: markValue.status as "P_ABSENT" | "P_LATE" | "P_LEAVE",
          markedAt: markValue.markedAt,
        }));
      return checkInService.submitSession({
        access,
        classroomId,
        sessionId: activeSession.id,
        exceptions,
        ...(activeSession.hasSubmittedResult
          ? {
              correctionReason,
              expectedLockVersion: activeSession.lockVersion,
            }
          : {}),
      });
    },
    onSuccess: (result) => {
      setDraftState((current) => {
        const active = baseDraft(current);
        return { ...active, session: result, history: [] };
      });
      // The cached lesson now carries a spent `lockVersion`. Leaving it would
      // let a correction after a remount send the stale one and be rejected as
      // somebody else's newer submit.
      void queryClient.invalidateQueries({
        queryKey: ["check-in", access, classroomId ?? null, "session"],
      });
    },
  });

  function setMode(next: "TABLE" | "CARD"): void {
    setModeState(next);
    window.localStorage.setItem(MODE_KEY, next);
  }

  function selectDate(next: string): void {
    startMutation.reset();
    submitMutation.reset();
    setDate(next);
  }

  function selectSubject(next: number | null): void {
    startMutation.reset();
    submitMutation.reset();
    if (next && !classroomSubjectId) {
      const unassignedKey = `${access}:${classroomId ?? "public"}:${date}:`;
      const assignedKey = `${access}:${classroomId ?? "public"}:${date}:${next}`;
      setDraftState((current) =>
        current.key === unassignedKey && !current.session
          ? { ...current, key: assignedKey }
          : current,
      );
    }
    setClassroomSubjectId(next);
  }

  const roster = rosterQuery.data ?? [];
  const counts = useMemo(() => {
    const result = {
      total: roster.length,
      marked: draft.marks.size,
      present: 0,
      absent: 0,
      late: 0,
      leave: 0,
    };
    draft.marks.forEach((item) => {
      if (item.status === "P_PRESENT") result.present += 1;
      if (item.status === "P_ABSENT") result.absent += 1;
      if (item.status === "P_LATE") result.late += 1;
      if (item.status === "P_LEAVE") result.leave += 1;
    });
    return result;
  }, [draft.marks, roster.length]);

  return {
    classroomSubjectId,
    clear,
    counts,
    date,
    actionError: startMutation.error ?? submitMutation.error,
    history: draft.history,
    // The open register counts as loading too: without it a submitted lesson
    // renders empty for a frame before its marks arrive.
    isLoading:
      optionsQuery.isLoading ||
      rosterQuery.isLoading ||
      openSessionQuery.isLoading,
    loadError: optionsQuery.error ?? rosterQuery.error,
    mark,
    markRemainingPresent,
    marks: draft.marks,
    maxDate: bangkokToday(),
    mode,
    options: optionsQuery.data,
    roster,
    session: draft.session,
    setClassroomSubjectId: selectSubject,
    setDate: selectDate,
    setMode,
    submit: submitMutation.mutateAsync,
    submitting: submitMutation.isPending,
    undo,
  };
}
