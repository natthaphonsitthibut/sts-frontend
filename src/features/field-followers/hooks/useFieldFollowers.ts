import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fieldFollowerService } from "../api/field-follower.service";
import type {
  CreateFollowerApplicationPayload,
  FieldFollowerListParams,
  FieldFollowerReviewAction,
} from "../types/field-follower.types";

const FIELD_FOLLOWERS_QUERY_KEY = "field-followers";

export function useApplyFieldFollower() {
  return useMutation({
    mutationFn: (payload: CreateFollowerApplicationPayload) =>
      fieldFollowerService.apply(payload),
  });
}

export function useFieldFollowers(params: FieldFollowerListParams) {
  return useQuery({
    queryKey: [FIELD_FOLLOWERS_QUERY_KEY, params],
    queryFn: () => fieldFollowerService.listFollowers(params),
    placeholderData: keepPreviousData,
  });
}

export function useReviewFieldFollower() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, action }: { id: string; action: FieldFollowerReviewAction }) =>
      fieldFollowerService.reviewFollower(id, action),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: [FIELD_FOLLOWERS_QUERY_KEY] });
    },
  });
}
