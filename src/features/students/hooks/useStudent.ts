import { useQuery } from "@tanstack/react-query";
import {
  studentsService,
  type StudentReadSource,
} from "../api/students.service";
import type { StudentDetail } from "../types/students.types";

export const STUDENT_QUERY_KEY = "student";

interface UseStudentResult {
  student: StudentDetail | undefined;
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
}

export function useStudent(
  studentId: string | undefined,
  source: StudentReadSource = "INTERNAL",
): UseStudentResult {
  const result = useQuery({
    // The source is part of the key: the same student read through a classroom
    // link is a different response than the staff read, and must not share a
    // cache entry with it.
    queryKey: [STUDENT_QUERY_KEY, studentId, source],
    queryFn: () => studentsService.getStudentById(studentId as string, source),
    enabled: Boolean(studentId),
  });

  return {
    student: result.data,
    isLoading: result.isLoading,
    isError: result.isError,
    refetch: () => {
      void result.refetch();
    },
  };
}
