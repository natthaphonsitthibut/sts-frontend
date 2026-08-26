import { useCallback, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
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

export function useCheckInWorkspace({
  access,
  classroomId,
  enabled = true,
}: UseCheckInWorkspaceInput) {
  const [date, setDate] = useState(bangkokToday);
  const [requestedSubjectId, setClassroomSubjectId] = useState<number | null>(
    null,
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
  const rosterQuery = useQuery({
    queryKey: ["check-in", access, classroomId ?? null, "roster"],
    queryFn: () => checkInService.getRoster({ access, classroomId }),
    enabled: canQuery,
  });

  const subjects = optionsQuery.data?.subjects ?? [];
  const classroomSubjectId = subjects.some(
    (item) => item.classroomSubjectId === requestedSubjectId,
  )
    ? requestedSubjectId
    : null;
  const selectionKey = `${access}:${classroomId ?? "public"}:${date}:${classroomSubjectId ?? ""}`;
  const draft =
    draftState.key === selectionKey ? draftState : emptyDraft(selectionKey);

  const startMutation = useMutation({
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
        const active =
          current.key === selectionKey ? current : emptyDraft(selectionKey);
        if (!result.readOnly || !rosterQuery.data) {
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
    [rosterQuery.data, selectionKey],
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
        const active =
          current.key === selectionKey ? current : emptyDraft(selectionKey);
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
    [draft.session?.readOnly, ensureStarted, selectionKey],
  );

  const undo = useCallback(() => {
    if (draft.session?.readOnly) return;
    setDraftState((current) => {
      const active =
        current.key === selectionKey ? current : emptyDraft(selectionKey);
      const last = active.history.at(-1);
      if (!last) return active;
      const marks = new Map(active.marks);
      for (const change of last.changes) {
        if (change.previous) marks.set(change.studentId, change.previous);
        else marks.delete(change.studentId);
      }
      return { ...active, marks, history: active.history.slice(0, -1) };
    });
  }, [draft.session?.readOnly, selectionKey]);

  const clear = useCallback(
    (studentId: string) => {
      if (draft.session?.readOnly || !draft.marks.has(studentId)) return;
      setDraftState((current) => {
        const active =
          current.key === selectionKey ? current : emptyDraft(selectionKey);
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
    [draft.marks, draft.session?.readOnly, selectionKey],
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
      const active =
        current.key === selectionKey ? current : emptyDraft(selectionKey);
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
    draft.marks,
    draft.session?.readOnly,
    ensureStarted,
    rosterQuery.data,
    selectionKey,
  ]);

  const submitMutation = useMutation({
    mutationFn: async () => {
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
        sessionId: activeSession.id,
        exceptions,
      });
    },
    onSuccess: (result) => {
      setDraftState((current) => {
        const active =
          current.key === selectionKey ? current : emptyDraft(selectionKey);
        return { ...active, session: result, history: [] };
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
    isLoading: optionsQuery.isLoading || rosterQuery.isLoading,
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
