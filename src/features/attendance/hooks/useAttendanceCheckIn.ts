import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { attendanceLookupService } from "../../tasks/api/attendance-lookup.service";
import type {
  GradeLevelOption,
  SchoolOption,
} from "../../tasks/api/attendance-lookup.service";
import { useAuthSessionStore } from "../../auth/store/auth-session.store";
import { attendanceService } from "../api/attendance.service";
import { resolveAttendanceScopeLock } from "../lib/attendance-scope";
import { getTodayIso } from "../lib/attendance-presentation";
import type {
  AttendanceSaveRecord,
  AttendanceSelectionStatus,
} from "../types/attendance.types";

const DEFAULT_STATUS: AttendanceSelectionStatus = "P_PRESENT";
const EMPTY_GRADE_LEVELS: GradeLevelOption[] = [];
const EMPTY_SCHOOLS: SchoolOption[] = [];
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
  const user = useAuthSessionStore((state) => state.user);
  const scope = useMemo(
    () => resolveAttendanceScopeLock(user?.data_scope),
    [user],
  );

  const gradeLevelsQuery = useQuery({
    queryKey: ["attendance-checkin-grade-levels"],
    queryFn: attendanceLookupService.getGradeLevels,
  });
  const schoolsQuery = useQuery({
    queryKey: ["attendance-checkin-schools"],
    queryFn: attendanceLookupService.getSchools,
  });

  const gradeLevels = gradeLevelsQuery.data ?? EMPTY_GRADE_LEVELS;
  const schools = schoolsQuery.data ?? EMPTY_SCHOOLS;

  // Raw selections for the unlocked dimensions.
  const [schoolInput, setSchoolInput] = useState("");
  const [gradeInput, setGradeInput] = useState("");
  const [roomInput, setRoomInput] = useState("");
  const [selections, setSelections] = useState<
    Record<string, AttendanceSelectionStatus>
  >({});

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

  const canLoadRoster = Boolean(schoolId && grade && room);
  const studentsQuery = useQuery({
    queryKey: ["attendance-checkin-students", schoolId, grade, room],
    queryFn: () => attendanceService.getStudents({ schoolId, grade, room }),
    enabled: canLoadRoster,
  });

  const saveMutation = useMutation({
    mutationFn: (records: AttendanceSaveRecord[]) =>
      attendanceService.saveAttendance(records),
  });

  const students = studentsQuery.data ?? EMPTY_STUDENTS;
  const counts = useMemo(() => {
    return students.reduce(
      (acc, student) => {
        const status = selections[student.id] ?? DEFAULT_STATUS;
        if (status === "P_PRESENT") acc.present += 1;
        else if (status === "P_ABSENT") acc.absent += 1;
        else if (status === "P_LATE") acc.late += 1;
        return acc;
      },
      { present: 0, absent: 0, late: 0 },
    );
  }, [students, selections]);

  function setStatus(studentId: string, status: AttendanceSelectionStatus): void {
    setSelections((current) => ({ ...current, [studentId]: status }));
  }

  // Changing the class resets unlocked downstream fields + marks.
  function setSchoolId(value: string): void {
    setSchoolInput(value);
    setRoomInput("");
    setSelections({});
  }

  function setGrade(value: string): void {
    setGradeInput(value);
    setRoomInput("");
    setSelections({});
  }

  function setRoom(value: string): void {
    setRoomInput(value);
    setSelections({});
  }

  function save(): void {
    if (!students.length) {
      return;
    }
    saveMutation.mutate(
      students.map((student) => ({
        student_id: student.id,
        status: selections[student.id] ?? DEFAULT_STATUS,
      })),
    );
  }

  return {
    scope,
    gradeLevels,
    schools,
    rooms,
    schoolId,
    grade,
    room,
    setSchoolId,
    setGrade,
    setRoom,
    students,
    selections,
    setStatus,
    counts,
    canLoadRoster,
    isRosterLoading: studentsQuery.isLoading && canLoadRoster,
    isRosterError: studentsQuery.isError,
    refetchRoster: studentsQuery.refetch,
    save,
    saveState: saveMutation,
  };
}

/** History view (past check-ins for a chosen date). */
export function useAttendanceHistory(date: string) {
  const historyQuery = useQuery({
    queryKey: ["attendance-checkin-history", date],
    queryFn: () => attendanceService.getHistory(date),
  });
  return {
    records: historyQuery.data ?? [],
    isLoading: historyQuery.isLoading,
    isError: historyQuery.isError,
    refetch: historyQuery.refetch,
  };
}

export { getTodayIso };
