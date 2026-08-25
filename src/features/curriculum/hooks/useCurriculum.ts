import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import type { PaginationMeta } from "../../../lib/pagination";
import { curriculumService } from "../api/curriculum.service";
import type {
  CurriculumGrade,
  CurriculumGradeQuery,
  CurriculumSubject,
  CurriculumSubjectPayload,
  CurriculumSubjectQuery,
} from "../types/curriculum.types";

export const CURRICULUM_QUERY_KEY = "curriculum";
const EMPTY_GRADES: CurriculumGrade[] = [];
const EMPTY_SUBJECTS: CurriculumSubject[] = [];

export function useCurriculumGrades(query: CurriculumGradeQuery | null) {
  const result = useQuery({
    queryKey: [CURRICULUM_QUERY_KEY, "grades", query],
    queryFn: () => curriculumService.getGrades(query!),
    enabled: Boolean(query),
    placeholderData: keepPreviousData,
  });
  return {
    grades: result.data ?? EMPTY_GRADES,
    isLoading: result.isLoading,
    isError: result.isError,
    refetch: result.refetch,
  };
}

export function useCurriculumSubjects(query: CurriculumSubjectQuery | null): {
  subjects: CurriculumSubject[];
  meta: PaginationMeta | undefined;
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
} {
  const result = useQuery({
    queryKey: [CURRICULUM_QUERY_KEY, "subjects", query],
    queryFn: () => curriculumService.getSubjects(query!),
    enabled: Boolean(query),
    placeholderData: keepPreviousData,
  });
  return {
    subjects: result.data?.items ?? EMPTY_SUBJECTS,
    meta: result.data?.meta,
    isLoading: result.isLoading,
    isError: result.isError,
    refetch: () => {
      void result.refetch();
    },
  };
}

export function useCurriculumSubject(
  id: number | null,
  query: CurriculumSubjectQuery | null,
) {
  return useQuery({
    queryKey: [CURRICULUM_QUERY_KEY, "subject", id, query],
    queryFn: () => curriculumService.getSubject(id!, query!),
    enabled: Boolean(id && query),
  });
}

export function useSaveCurriculumSubject() {
  const client = useQueryClient();
  return useMutation<
    CurriculumSubject,
    Error,
    { id: number | null; payload: CurriculumSubjectPayload }
  >({
    mutationFn: ({ id, payload }) =>
      id
        ? curriculumService.updateSubject(id, payload)
        : curriculumService.createSubject(payload),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: [CURRICULUM_QUERY_KEY] });
    },
  });
}

export function useDeleteCurriculumSubject(
  query: CurriculumSubjectQuery | null,
) {
  const client = useQueryClient();
  return useMutation<void, Error, number>({
    mutationFn: (id) => curriculumService.deleteSubject(id, query!),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: [CURRICULUM_QUERY_KEY] });
    },
  });
}
