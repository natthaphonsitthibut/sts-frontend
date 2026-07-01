import { useQuery } from "@tanstack/react-query";
import { studentsService } from "../api/students.service";
import type { StudentAttendanceSummaryResponse } from "../types/students.types";

export const STUDENT_ATTENDANCE_QUERY_KEY = "student-attendance-summary";

interface UseStudentAttendanceSummaryResult {
  summary: StudentAttendanceSummaryResponse | undefined;
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
}

export function useStudentAttendanceSummary(
  studentId: string | undefined,
): UseStudentAttendanceSummaryResult {
  const result = useQuery({
    queryKey: [STUDENT_ATTENDANCE_QUERY_KEY, studentId],
    queryFn: () =>
      studentsService.getStudentAttendanceSummary(studentId as string),
    enabled: Boolean(studentId),
  });

  return {
    summary: result.data,
    isLoading: result.isLoading,
    isError: result.isError,
    refetch: () => {
      void result.refetch();
    },
  };
}
