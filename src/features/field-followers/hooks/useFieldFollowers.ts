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

export function useUploadFollowerIdCardPhoto() {
  return useMutation({
    mutationFn: (file: File) => fieldFollowerService.uploadIdCardPhoto(file),
  });
}

export function useFieldFollowers(
  params: FieldFollowerListParams,
  options: { enabled?: boolean } = {},
) {
  return useQuery({
    queryKey: [FIELD_FOLLOWERS_QUERY_KEY, params],
    queryFn: () => fieldFollowerService.listFollowers(params),
    enabled: options.enabled ?? true,
    placeholderData: keepPreviousData,
  });
}

export function useFieldFollower(id: string) {
  return useQuery({
    queryKey: [FIELD_FOLLOWERS_QUERY_KEY, "detail", id],
    queryFn: () => fieldFollowerService.getFollower(id),
    enabled: Boolean(id),
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

const FIELD_MONITOR_MAP_QUERY_KEY = "field-monitor-map";

export function useFieldMonitorMap(studentUuids: string[]) {
  return useQuery({
    queryKey: [FIELD_MONITOR_MAP_QUERY_KEY, studentUuids],
    queryFn: () => fieldFollowerService.getMap(studentUuids),
    enabled: studentUuids.length > 0,
  });
}
