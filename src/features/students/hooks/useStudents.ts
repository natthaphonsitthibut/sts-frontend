import { useQuery } from "@tanstack/react-query";
import { studentsService } from "../api/students.service";
import type { StudentListItem, StudentListQuery } from "../types/students.types";

export const STUDENTS_QUERY_KEY = "students";

const EMPTY_STUDENTS: StudentListItem[] = [];

interface UseStudentsResult {
  students: StudentListItem[];
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
}

export function useStudents(query: StudentListQuery = {}): UseStudentsResult {
  const result = useQuery({
    queryKey: [STUDENTS_QUERY_KEY, query],
    queryFn: () => studentsService.getStudents(query),
  });

  return {
    students: result.data ?? EMPTY_STUDENTS,
    isLoading: result.isLoading,
    isError: result.isError,
    refetch: () => {
      void result.refetch();
    },
  };
}
