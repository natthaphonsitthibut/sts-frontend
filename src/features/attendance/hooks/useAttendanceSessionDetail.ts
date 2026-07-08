import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
 * Read-only roster + session view for one specific historical day/room, used
 * by the anomaly "ตรวจวันนั้น" dialog. The save-attendance endpoint has no
 * date param (it always writes "today" server-side), so past days can only be
 * inspected and, if submitted, reopened — not re-saved from here.
 */
export function useAttendanceSessionDetail({
  schoolId,
  grade,
  room,
  date,
  enabled,
}: UseAttendanceSessionDetailParams) {
  const queryClient = useQueryClient();
  const canLoad = enabled && Boolean(schoolId && grade && room && date);

  const studentsQuery = useQuery({
    queryKey: ["attendance-session-detail-students", schoolId, grade, room],
    queryFn: () => attendanceService.getStudents({ schoolId, grade, room }),
    enabled: canLoad,
  });
  const sessionQuery = useQuery({
    queryKey: ["attendance-session-detail-session", schoolId, grade, room, date],
    queryFn: () => attendanceService.getSessionContext({ schoolId, grade, room, date }),
    enabled: canLoad,
  });
  const historyQuery = useQuery({
    queryKey: ["attendance-session-detail-history", schoolId, date],
    queryFn: () => attendanceService.getHistory(date, schoolId),
    enabled: canLoad,
  });

  const students = studentsQuery.data ?? EMPTY_STUDENTS;
  const selections = useMemo(() => {
    return (historyQuery.data ?? [])
      .filter((record) => record.grade === grade && String(record.room) === String(room))
      .reduce<Record<string, AttendanceSelectionStatus>>((next, record) => {
        if (record.id) next[record.id] = record.status;
        return next;
      }, {});
  }, [historyQuery.data, grade, room]);

  const reopenMutation = useMutation({
    mutationFn: (reason: string) => {
      const sessionId = sessionQuery.data?.session?.id;
      if (!sessionId) throw new Error("Attendance session is missing");
      return attendanceService.reopenSession(sessionId, reason);
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["attendance-session-detail-session", schoolId, grade, room, date],
        }),
        queryClient.invalidateQueries({ queryKey: ["attendance-reconciliation"] }),
        queryClient.invalidateQueries({ queryKey: ["attendance-reconciliation-anomalies"] }),
      ]);
    },
  });

  return {
    students,
    selections,
    isLoading:
      canLoad &&
      (studentsQuery.isLoading || sessionQuery.isLoading || historyQuery.isLoading),
    isError: studentsQuery.isError || sessionQuery.isError || historyQuery.isError,
    session: sessionQuery.data?.session ?? null,
    dayType: sessionQuery.data?.dayType ?? null,
    reopen: reopenMutation.mutateAsync,
    reopenState: reopenMutation,
  };
}
