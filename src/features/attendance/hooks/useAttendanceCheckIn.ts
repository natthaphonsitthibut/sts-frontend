import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { attendanceLookupService } from "../../tasks/api/attendance-lookup.service";
import type { GradeLevelOption } from "../../tasks/api/attendance-lookup.service";
import { useAuthSessionStore } from "../../auth/store/auth-session.store";
import { attendanceService } from "../api/attendance.service";
import { resolveAttendanceScopeLock } from "../lib/attendance-scope";
import { getTodayIso } from "../lib/attendance-presentation";
import { useSchoolAreaFilter } from "./useSchoolAreaFilter";
import type {
  AttendanceSaveRecord,
  AttendanceSelectionStatus,
} from "../types/attendance.types";

const DEFAULT_STATUS: AttendanceSelectionStatus = "P_PRESENT";
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
  const [selections, setSelections] = useState<
    Record<string, AttendanceSelectionStatus>
  >({});
  const [previousSelections, setPreviousSelections] = useState<Record<
    string,
    AttendanceSelectionStatus
  > | null>(null);

  // Effective filters: locked dimensions come straight from scope; unlocked
  // ones from user input. No effects, no stored-then-synced state.
  const lockedGradeLabel = useMemo(
    () =>
      gradeLevels.find((level) => level.id === scope.lockedGradeLevelId)?.label ??
      "",
    [gradeLevels, scope.lockedGradeLevelId],
  );

  const schoolId = scope.isSchoolLocked
    ? String(scope.lockedSchoolId ?? "")
    : schoolInput;
  const grade = scope.isGradeLocked ? lockedGradeLabel : gradeInput;

  const roomsQuery = useQuery({
    queryKey: ["attendance-checkin-rooms", grade, schoolId],
    queryFn: () => attendanceLookupService.getRooms(grade, schoolId),
    enabled: Boolean(grade),
  });
  const rooms = roomsQuery.data ?? EMPTY_ROOMS;

  // Drop a room that the current grade/school no longer offers (derived, not stored).
  const room = scope.isRoomLocked
    ? scope.lockedRoom ?? ""
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
    queryKey: ["attendance-session", schoolId, grade, room, attendanceDate, sessionKey],
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
    queryKey: ["attendance-checkin-history", attendanceDate, schoolId, sessionKind, sessionKey],
    queryFn: () =>
      attendanceService.getHistory(attendanceDate, schoolId, {
        sessionKind,
        timetableSlotId,
      }),
    enabled: canLoadRoster,
  });

  const saveMutation = useMutation({
    mutationFn: (records: AttendanceSaveRecord[]) =>
      attendanceService.saveAttendance(records, { timetableSlotId, date: attendanceDate }),
    onSuccess: async () => {
      setSelections({});
      setPreviousSelections(null);
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["attendance-session", schoolId, grade, room, attendanceDate, sessionKey],
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
      setSelections({});
      setPreviousSelections(null);
      await queryClient.invalidateQueries({
        queryKey: ["attendance-session", schoolId, grade, room, attendanceDate, sessionKey],
      });
    },
  });

  const students = studentsQuery.data ?? EMPTY_STUDENTS;
  const existingSelections = useMemo(
    () =>
      (existingAttendanceQuery.data ?? []).reduce<
        Record<string, AttendanceSelectionStatus>
      >((next, record) => {
        if (record.id) next[record.id] = record.status;
        return next;
      }, {}),
    [existingAttendanceQuery.data],
  );
  const effectiveSelections = useMemo(
    () => ({ ...existingSelections, ...selections }),
    [existingSelections, selections],
  );
  const session = sessionQuery.data?.session ?? null;
  const canEditAttendance = session?.status !== "SUBMITTED";
  const counts = useMemo(() => {
    return students.reduce(
      (acc, student) => {
        const status = effectiveSelections[student.id] ?? DEFAULT_STATUS;
        if (status === "P_PRESENT") acc.present += 1;
        else if (status === "P_ABSENT") acc.absent += 1;
        else if (status === "P_LATE") acc.late += 1;
        return acc;
      },
      { present: 0, absent: 0, late: 0 },
    );
  }, [students, effectiveSelections]);

  function setStatus(studentId: string, status: AttendanceSelectionStatus): void {
    if (!canEditAttendance) return;
    setPreviousSelections(effectiveSelections);
    setSelections((current) => ({ ...current, [studentId]: status }));
  }

  function setAllStatus(status: AttendanceSelectionStatus): void {
    if (!students.length || !canEditAttendance) {
      return;
    }

    setPreviousSelections(effectiveSelections);
    setSelections(
      students.reduce<Record<string, AttendanceSelectionStatus>>((next, student) => {
        next[student.id] = status;
        return next;
      }, {}),
    );
  }

  function undoSelections(): void {
    if (!previousSelections) {
      return;
    }

    setSelections(previousSelections);
    setPreviousSelections(null);
  }

  // Changing the class resets unlocked downstream fields + marks.
  function setSchoolId(value: string): void {
    setSchoolInput(value);
    setRoomInput("");
    setSelections({});
    setPreviousSelections(null);
  }

  function setGrade(value: string): void {
    setGradeInput(value);
    setRoomInput("");
    setSelections({});
    setPreviousSelections(null);
  }

  function setRoom(value: string): void {
    setRoomInput(value);
    setSelections({});
    setPreviousSelections(null);
  }

  function save(): void {
    if (!students.length || !canEditAttendance) {
      return;
    }
    saveMutation.mutate(
      students.map((student) => ({
        student_id: student.id,
        status: effectiveSelections[student.id] ?? DEFAULT_STATUS,
      })),
    );
  }

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
    selections: effectiveSelections,
    setStatus,
    setAllStatus,
    undoSelections,
    canUndoSelections: Boolean(previousSelections),
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
    queryKey: ["attendance-checkin-history", date, schoolId ?? "", "DAILY", "daily"],
    queryFn: () => attendanceService.getHistory(date, schoolId, { sessionKind: "DAILY" }),
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
