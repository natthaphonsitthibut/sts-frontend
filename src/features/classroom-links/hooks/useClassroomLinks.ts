import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { classroomLinksService } from "../api/classroom-links.service";
import type { ClassroomLinkListParams } from "../types/classroom-links.types";

const KEY = "classroom-links";

export function useClassroomLinks(params: ClassroomLinkListParams | null) {
  return useQuery({
    queryKey: [KEY, "list", params],
    queryFn: () => classroomLinksService.list(params!),
    enabled: Boolean(params),
  });
}

function useRefreshClassroomLinks() {
  const client = useQueryClient();
  return () => client.invalidateQueries({ queryKey: [KEY, "list"] });
}

export function useBulkCreateClassroomLinks() {
  const refresh = useRefreshClassroomLinks();
  return useMutation({
    mutationFn: classroomLinksService.bulkCreate,
    onSuccess: refresh,
  });
}

export function useRedisplayClassroomLink() {
  return useMutation({ mutationFn: classroomLinksService.redisplay });
}

export function useRotateClassroomLink() {
  const refresh = useRefreshClassroomLinks();
  return useMutation({
    mutationFn: classroomLinksService.rotate,
    onSuccess: refresh,
  });
}

export function useDeactivateClassroomLink() {
  const refresh = useRefreshClassroomLinks();
  return useMutation({
    mutationFn: classroomLinksService.deactivate,
    onSuccess: refresh,
  });
}

export function useResendClassroomLinkLine() {
  const refresh = useRefreshClassroomLinks();
  return useMutation({
    mutationFn: classroomLinksService.resendLine,
    onSuccess: refresh,
  });
}
