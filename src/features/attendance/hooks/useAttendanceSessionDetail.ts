import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { attendanceService } from "../api/attendance.service";
import type { AttendanceSelectionStatus } from "../types/attendance.types";

const EMPTY_STUDENTS: Awaited<
  ReturnType<typeof attendanceService.getStudents>
> = [];

interface UseAttendanceSessionDetailParams {
  schoolId: string;
  grade: string;
  room: string;
  date: string;
  /** Skip every query until the owning dialog is actually open. */
  enabled: boolean;
}

/**
 * Read-only roster + all-subject day view for one historical room/day.
 */
export function useAttendanceSessionDetail({
  schoolId,
  grade,
  room,
  date,
  enabled,
}: UseAttendanceSessionDetailParams) {
  const canLoad = enabled && Boolean(schoolId && grade && room && date);

  const studentsQuery = useQuery({
    queryKey: ["attendance-session-detail-students", schoolId, grade, room],
    queryFn: () => attendanceService.getStudents({ schoolId, grade, room }),
    enabled: canLoad,
  });
  const historyQuery = useQuery({
    queryKey: ["attendance-session-detail-history", schoolId, date],
    queryFn: () => attendanceService.getHistory(date, schoolId),
    enabled: canLoad,
  });

  const students = studentsQuery.data ?? EMPTY_STUDENTS;
  const selections = useMemo(() => {
    const byStudent = new Map<string, AttendanceSelectionStatus[]>();
    for (const record of historyQuery.data ?? []) {
      if (
        record.grade !== grade ||
        String(record.room) !== String(room) ||
        !record.id
      )
        continue;
      const statuses = byStudent.get(record.id) ?? [];
      statuses.push(record.status);
      byStudent.set(record.id, statuses);
    }
    return Object.fromEntries(
      [...byStudent.entries()].map(([studentId, statuses]) => {
        const status: AttendanceSelectionStatus = statuses.every(
          (value) => value === "P_LEAVE",
        )
          ? "P_LEAVE"
          : statuses.every(
                (value) => value !== "P_PRESENT" && value !== "P_LATE",
              )
            ? "P_ABSENT"
            : statuses.some((value) => value === "P_LATE")
              ? "P_LATE"
              : "P_PRESENT";
        return [studentId, status];
      }),
    );
  }, [historyQuery.data, grade, room]);

  return {
    students,
    selections,
    isLoading: canLoad && (studentsQuery.isLoading || historyQuery.isLoading),
    isError: studentsQuery.isError || historyQuery.isError,
  };
}
