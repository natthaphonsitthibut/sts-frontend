import { useQuery } from "@tanstack/react-query";
import { studentsService } from "../api/students.service";
import type { StudentDetail } from "../types/students.types";

export const STUDENT_QUERY_KEY = "student";

interface UseStudentResult {
  student: StudentDetail | undefined;
  isLoading: boolean;
  isError: boolean;
}

export function useStudent(studentId: string | undefined): UseStudentResult {
  const result = useQuery({
    queryKey: [STUDENT_QUERY_KEY, studentId],
    queryFn: () => studentsService.getStudentById(studentId as string),
    enabled: Boolean(studentId),
  });

  return {
    student: result.data,
    isLoading: result.isLoading,
    isError: result.isError,
  };
}
