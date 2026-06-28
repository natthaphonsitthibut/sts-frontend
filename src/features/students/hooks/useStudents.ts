import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { studentsService } from "../api/students.service";
import type {
  PaginationMeta,
  StudentFilterOptions,
  StudentListItem,
  StudentListQuery,
} from "../types/students.types";

export const STUDENTS_QUERY_KEY = "students";
export const STUDENT_FILTER_OPTIONS_QUERY_KEY = "student-filter-options";

const EMPTY_STUDENTS: StudentListItem[] = [];
const EMPTY_FILTER_OPTIONS: StudentFilterOptions = { grades: [], rooms: [] };

interface UseStudentsResult {
  students: StudentListItem[];
  meta: PaginationMeta | undefined;
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  refetch: () => void;
}

export function useStudents(query: StudentListQuery = {}): UseStudentsResult {
  const result = useQuery({
    queryKey: [STUDENTS_QUERY_KEY, query],
    queryFn: () => studentsService.getStudents(query),
    // Keep the previous page visible while the next one loads so the table does
    // not flash an empty state between paginated fetches.
    placeholderData: keepPreviousData,
  });

  return {
    students: result.data?.items ?? EMPTY_STUDENTS,
    meta: result.data?.meta,
    isLoading: result.isLoading,
    isFetching: result.isFetching,
    isError: result.isError,
    refetch: () => {
      void result.refetch();
    },
  };
}

interface UseStudentFilterOptionsResult {
  options: StudentFilterOptions;
  isLoading: boolean;
}

export function useStudentFilterOptions(
  query: Pick<
    StudentListQuery,
    "schoolId" | "province" | "district" | "subDistrict" | "grade"
  > = {},
): UseStudentFilterOptionsResult {
  const result = useQuery({
    queryKey: [STUDENT_FILTER_OPTIONS_QUERY_KEY, query],
    queryFn: () => studentsService.getFilterOptions(query),
    // Filter options change rarely (only on import/student mutations); avoid
    // refetching them on every page or filter change.
    staleTime: 5 * 60 * 1000,
  });

  return {
    options: result.data ?? EMPTY_FILTER_OPTIONS,
    isLoading: result.isLoading,
  };
}
