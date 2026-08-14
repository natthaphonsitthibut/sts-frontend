import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { attendanceLookupService } from "../../tasks/api/attendance-lookup.service";
import type { GradeLevelOption } from "../../tasks/api/attendance-lookup.service";
import { useAuthSessionStore } from "../../auth/store/auth-session.store";
import { attendanceService } from "../api/attendance.service";
import { resolveAttendanceScopeLock } from "../lib/attendance-scope";
import {
  countAttendanceStatuses,
  getTodayIso,
} from "../lib/attendance-presentation";
import { useSchoolAreaFilter } from "./useSchoolAreaFilter";
import { useAttendanceMarks } from "./useAttendanceMarks";
import type {
  AttendanceMark,
  AttendanceSaveRecord,
  AttendanceSelectionStatus,
} from "../types/attendance.types";

const EMPTY_GRADE_LEVELS: GradeLevelOption[] = [];
const EMPTY_ROOMS: string[] = [];
const EMPTY_STUDENTS: Awaited<
  ReturnType<typeof attendanceService.getStudents>
> = [];

/**
 * Direct teacher check-in orchestration (parity with Quasar AttendancePage):
 * scope-locked school/grade/room pickers → roster → mark → save, plus a
 * history view. Scope-locked dimensions are *derived* from the teacher's
 * data_scope (not stored) so a teacher only ever touches their own class and
 * we avoid setState-in-effect churn.
 */
export function useAttendanceCheckIn() {
  return useAttendanceCheckInForSession({});
}

export function useAttendanceCheckInForSession({
  enabled = true,
  timetableSlotId,
  date,
}: {
  enabled?: boolean;
  timetableSlotId?: number | null;
  /** Attendance date to check in for, `YYYY-MM-DD`; defaults to today. */
  date?: string;
}) {
  const queryClient = useQueryClient();
  const user = useAuthSessionStore((state) => state.user);
  const scope = useMemo(
    () => resolveAttendanceScopeLock(user?.data_scope),
    [user],
  );
  const schoolArea = useSchoolAreaFilter();

  const gradeLevelsQuery = useQuery({
    queryKey: ["attendance-checkin-grade-levels"],
    queryFn: attendanceLookupService.getGradeLevels,
  });

  const gradeLevels = gradeLevelsQuery.data ?? EMPTY_GRADE_LEVELS;

  // Raw selections for the unlocked dimensions.
  const [schoolInput, setSchoolInput] = useState("");
  const [gradeInput, setGradeInput] = useState("");
  const [roomInput, setRoomInput] = useState("");
  // Effective filters: locked dimensions come straight from scope; unlocked
  // ones from user input. No effects, no stored-then-synced state.
  const lockedGradeLabel = useMemo(
    () =>
      gradeLevels.find((level) => level.id === scope.lockedGradeLevelId)
        ?.label ?? "",
    [gradeLevels, scope.lockedGradeLevelId],
  );

  const onlyScopedSchoolId =
    schoolArea.filteredSchools.length === 1
      ? String(schoolArea.filteredSchools[0].id)
      : "";
  const schoolId = scope.isSchoolLocked
    ? String(scope.lockedSchoolId ?? "")
    : schoolInput || onlyScopedSchoolId;
  const grade = scope.isGradeLocked ? lockedGradeLabel : gradeInput;

  const roomsQuery = useQuery({
    queryKey: ["attendance-checkin-rooms", grade, schoolId],
    queryFn: () => attendanceLookupService.getRooms(grade, schoolId),
    enabled: Boolean(grade),
  });
  const rooms = roomsQuery.data ?? EMPTY_ROOMS;

  // Drop a room that the current grade/school no longer offers (derived, not stored).
  const room = scope.isRoomLocked
    ? (scope.lockedRoom ?? "")
    : rooms.includes(roomInput)
      ? roomInput
      : "";

  const canLoadRoster = Boolean(enabled && schoolId && grade && room);
  const studentsQuery = useQuery({
    queryKey: ["attendance-checkin-students", schoolId, grade, room],
    queryFn: () => attendanceService.getStudents({ schoolId, grade, room }),
    enabled: canLoadRoster,
  });

  const attendanceDate = date ?? getTodayIso();
  const sessionKind = timetableSlotId ? "SUBJECT" : "DAILY";
  const sessionKey = timetableSlotId ?? "daily";
  const sessionQuery = useQuery({
    queryKey: [
      "attendance-session",
      schoolId,
      grade,
      room,
      attendanceDate,
      sessionKey,
    ],
    queryFn: () =>
      attendanceService.getSessionContext({
        schoolId,
        grade,
        room,
        date: attendanceDate,
        timetableSlotId,
      }),
    enabled: canLoadRoster,
  });
  const existingAttendanceQuery = useQuery({
    queryKey: [
      "attendance-checkin-history",
      attendanceDate,
      schoolId,
      sessionKind,
      sessionKey,
    ],
    queryFn: () =>
      attendanceService.getHistory(attendanceDate, schoolId, {
        sessionKind,
        timetableSlotId,
      }),
    enabled: canLoadRoster,
  });

  // The mutations are declared before the marks hook exists, so the reset is
  // reached through a ref rather than reordering the hook graph.
  const marksResetRef = useRef<(() => void) | null>(null);

  const saveMutation = useMutation({
    mutationFn: (records: AttendanceSaveRecord[]) =>
      attendanceService.saveAttendance(records, {
        timetableSlotId,
        date: attendanceDate,
      }),
    onSuccess: async () => {
      marksResetRef.current?.();
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: [
            "attendance-session",
            schoolId,
            grade,
            room,
            attendanceDate,
            sessionKey,
          ],
        }),
        queryClient.invalidateQueries({
          queryKey: [
            "attendance-checkin-history",
            attendanceDate,
            schoolId,
            sessionKind,
            sessionKey,
          ],
        }),
      ]);
    },
  });
  const reopenMutation = useMutation({
    mutationFn: (reason: string) => {
      const sessionId = sessionQuery.data?.session?.id;
      if (!sessionId) throw new Error("Attendance session is missing");
      return attendanceService.reopenSession(sessionId, reason);
    },
    onSuccess: async () => {
      marksResetRef.current?.();
      await queryClient.invalidateQueries({
        queryKey: [
          "attendance-session",
          schoolId,
          grade,
          room,
          attendanceDate,
          sessionKey,
        ],
      });
    },
  });

  const students = studentsQuery.data ?? EMPTY_STUDENTS;
  const rosterIds = useMemo(() => students.map((student) => student.id), [students]);
  const session = sessionQuery.data?.session ?? null;
  const canEditAttendance = session?.status !== "SUBMITTED";

  // Marks already stored for this round, so reopening the page shows what was
  // checked earlier instead of an empty roster.
  const serverMarks = useMemo(
    () =>
      (existingAttendanceQuery.data ?? []).reduce<Record<string, AttendanceMark>>(
        (next, record) => {
          if (record.id && record.status !== "NONE") {
            next[record.id] = {
              status: record.status,
              markedAt: record.marked_at ?? "",
            };
          }
          return next;
        },
        {},
      ),
    [existingAttendanceQuery.data],
  );

  const sessionMarksKey = `${schoolId}:${grade}:${room}:${attendanceDate}:${sessionKey}`;
  const transport = useMemo(
    () => ({
      saveMarks: async (batch: Array<{ studentId: string; mark: AttendanceMark | null }>) => {
        await attendanceService.saveAttendanceMarks(
          batch
            .filter((entry) => entry.mark !== null)
            .map(({ studentId, mark }) => ({
              student_id: studentId,
              status: (mark as AttendanceMark).status,
              marked_at: (mark as AttendanceMark).markedAt || null,
            })),
          {
            timetableSlotId,
            date: attendanceDate,
            clearedStudentIds: batch
              .filter((entry) => entry.mark === null)
              .map((entry) => entry.studentId),
          },
        );
      },
    }),
    [attendanceDate, timetableSlotId],
  );

  const marksState = useAttendanceMarks({
    serverMarks,
    rosterIds,
    sessionKey: sessionMarksKey,
    transport,
    enabled: canEditAttendance,
  });

  const selections = marksState.marks;
  useEffect(() => {
    marksResetRef.current = marksState.reset;
  }, [marksState.reset]);
  const counts = useMemo(
    () =>
      countAttendanceStatuses(
        rosterIds.map((studentId) => selections[studentId]?.status ?? "NONE"),
      ),
    [rosterIds, selections],
  );

  // Changing the class resets the downstream fields; the marks hook flushes and
  // resets itself off the session key, so pending taps are never dropped here.
  function setSchoolId(value: string): void {
    setSchoolInput(value);
    setRoomInput("");
  }

  function setGrade(value: string): void {
    setGradeInput(value);
    setRoomInput("");
  }

  function setRoom(value: string): void {
    setRoomInput(value);
  }

  /** Closes the round. Every pending tap is flushed first so nothing is lost. */
  const save = useCallback(async (): Promise<void> => {
    if (!rosterIds.length || !canEditAttendance || marksState.unmarkedCount > 0) {
      return;
    }
    await marksState.flush();
    await saveMutation.mutateAsync(
      rosterIds.map((studentId) => ({
        student_id: studentId,
        status: selections[studentId].status,
        marked_at: selections[studentId].markedAt || null,
      })),
    );
  }, [canEditAttendance, marksState, rosterIds, saveMutation, selections]);

  return {
    scope,
    schoolArea,
    gradeLevels,
    rooms,
    schoolId,
    grade,
    room,
    setSchoolId,
    setGrade,
    setRoom,
    students,
    selections: useMemo(
      () =>
        Object.fromEntries(
          Object.entries(selections).map(([studentId, mark]) => [studentId, mark.status]),
        ) as Record<string, AttendanceSelectionStatus>,
      [selections],
    ),
    setStatus: marksState.setStatus,
    markRemainingPresent: marksState.markRemainingPresent,
    undoSelections: marksState.undo,
    canUndoSelections: marksState.canUndo,
    unmarkedCount: marksState.unmarkedCount,
    markedCount: marksState.markedCount,
    autosaveState: marksState.autosaveState,
    autosaveFailureMessage: marksState.failureMessage,
    lastSavedAt: marksState.lastSavedAt,
    flushMarks: marksState.flush,
    counts,
    canLoadRoster,
    isRosterLoading: studentsQuery.isLoading && canLoadRoster,
    isRosterError: studentsQuery.isError,
    refetchRoster: studentsQuery.refetch,
    save,
    saveState: saveMutation,
    sessionContext: sessionQuery.data ?? null,
    isSessionLoading: sessionQuery.isLoading && canLoadRoster,
    isSessionError: sessionQuery.isError,
    canEditAttendance,
    reopen: reopenMutation.mutateAsync,
    reopenState: reopenMutation,
  };
}

/** History view (past check-ins for a chosen date, scoped to one school). */
export function useAttendanceHistory(date: string, schoolId?: string) {
  const historyQuery = useQuery({
    queryKey: [
      "attendance-checkin-history",
      date,
      schoolId ?? "",
      "DAILY",
      "daily",
    ],
    queryFn: () =>
      attendanceService.getHistory(date, schoolId, { sessionKind: "DAILY" }),
    // Server requires a school to avoid a nationwide day dump — don't fetch
    // until one is selected.
    enabled: Boolean(schoolId),
  });
  return {
    records: historyQuery.data ?? [],
    isLoading: historyQuery.isLoading,
    isError: historyQuery.isError,
    refetch: historyQuery.refetch,
  };
}

export { getTodayIso };
