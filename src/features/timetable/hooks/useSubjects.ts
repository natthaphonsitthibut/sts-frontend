import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { subjectsService } from "../api/subjects.service";
import type { CreateSubjectPayload, UpdateSubjectPayload } from "../types/timetable.types";

const SUBJECTS_QUERY_KEY = "subjects";

export function useSubjects(params?: { searchTerm?: string; isActive?: boolean }) {
  return useQuery({
    queryKey: [SUBJECTS_QUERY_KEY, params],
    queryFn: () => subjectsService.listSubjects(params),
  });
}

export function useCreateSubject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateSubjectPayload) => subjectsService.createSubject(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: [SUBJECTS_QUERY_KEY] });
    },
  });
}

export function useUpdateSubject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UpdateSubjectPayload }) =>
      subjectsService.updateSubject(id, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: [SUBJECTS_QUERY_KEY] });
    },
  });
}
