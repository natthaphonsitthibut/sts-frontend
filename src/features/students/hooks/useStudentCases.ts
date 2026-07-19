import { useQuery } from "@tanstack/react-query";
import { studentsService } from "../api/students.service";
import type { StudentCase } from "../types/students.types";

export const STUDENT_CASES_QUERY_KEY = "student-cases";

const EMPTY_CASES: StudentCase[] = [];

interface UseStudentCasesResult {
  cases: StudentCase[];
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
}

export function useStudentCases(
  studentId: string | undefined,
): UseStudentCasesResult {
  const result = useQuery({
    queryKey: [STUDENT_CASES_QUERY_KEY, studentId],
    queryFn: () => studentsService.getStudentCasesById(studentId as string),
    enabled: Boolean(studentId),
  });

  return {
    cases: result.data ?? EMPTY_CASES,
    isLoading: result.isLoading,
    isError: result.isError,
    refetch: () => {
      void result.refetch();
    },
  };
}
