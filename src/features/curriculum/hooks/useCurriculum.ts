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

/** `null` keeps the query idle while no school is selected yet. */
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
    refetch: () => {
      void result.refetch();
    },
  };
}

interface UseCurriculumSubjectsResult {
  subjects: CurriculumSubject[];
  meta: PaginationMeta | undefined;
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
}

export function useCurriculumSubjects(
  query: CurriculumSubjectQuery | null,
): UseCurriculumSubjectsResult {
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

export function useCurriculumSubject(id: string | null) {
  return useQuery({
    queryKey: [CURRICULUM_QUERY_KEY, "subject", id],
    queryFn: () => curriculumService.getSubject(id!),
    enabled: Boolean(id),
  });
}

interface SaveSubjectVariables {
  id: string | null;
  payload: CurriculumSubjectPayload;
  /** Chosen in the form but only uploadable once the subject row exists. */
  content?: File;
  removeContent?: boolean;
}

/**
 * Saves the subject then syncs its PDF in the same mutation, so the form has a
 * single pending/error state to render.
 */
export function useSaveCurriculumSubject() {
  const queryClient = useQueryClient();
  return useMutation<CurriculumSubject, Error, SaveSubjectVariables>({
    mutationFn: async ({ id, payload, content, removeContent }) => {
      const subject = id
        ? await curriculumService.updateSubject(id, payload)
        : await curriculumService.createSubject(payload);
      if (content || removeContent) {
        await curriculumService.updateSubjectContent(subject.id, {
          content,
          remove: removeContent,
        });
      }
      return subject;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [CURRICULUM_QUERY_KEY] });
    },
  });
}

export function useDeleteCurriculumSubject() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: (id) => curriculumService.deleteSubject(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [CURRICULUM_QUERY_KEY] });
    },
  });
}
