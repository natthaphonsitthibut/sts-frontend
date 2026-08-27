import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  ClassroomStudentCommentConcernLevelOption,
  ClassroomStudentProblemCategoryOption,
} from "../../school-structure/types/school-structure.types";
import { checkInService } from "../api/check-in.service";

/**
 * What the comment dialog needs to work from a classroom link: the same
 * catalogs and the same write, served by the link's own namespace because a
 * link holds no account. Off on the staff surface, where the dialog reaches
 * the school-structure API by itself.
 */
export function useClassroomLinkComments(enabled: boolean) {
  const queryClient = useQueryClient();
  const optionsQuery = useQuery({
    queryKey: ["classroom-link", "comment-options"],
    queryFn: checkInService.getCommentOptions,
    enabled,
    staleTime: 30 * 60 * 1000,
  });
  const mutation = useMutation({
    mutationFn: (input: {
      studentUuid: string;
      problemCategory: string;
      concernLevelCode: string;
      problemDescription: string;
    }) => checkInService.createComment(input),
    onSuccess: async () => {
      // The roster carries the latest comment in its หมายเหตุ column, and the
      // profile lists them, so both have to be re-read after a write.
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["check-in"] }),
        queryClient.invalidateQueries({ queryKey: ["classroom-link"] }),
      ]);
    },
  });

  if (!enabled) {
    return {
      concernLevels: undefined,
      isSubmitting: undefined,
      problemCategories: undefined,
      submitComment: undefined,
      submitError: undefined,
    };
  }

  return {
    concernLevels: optionsQuery.data?.concernLevels as
      | ClassroomStudentCommentConcernLevelOption[]
      | undefined,
    isSubmitting: mutation.isPending,
    problemCategories: optionsQuery.data?.problemCategories as
      | ClassroomStudentProblemCategoryOption[]
      | undefined,
    submitComment: (input: {
      classroomId: number;
      studentUuid: string;
      problemCategory: string;
      concernLevelCode: string;
      problemDescription: string;
    }) => mutation.mutateAsync(input),
    submitError: mutation.error,
  };
}
