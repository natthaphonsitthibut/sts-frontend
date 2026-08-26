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
    // Every action on the page reports its own outcome (rooms ready, LINE
    // delivery, link closed), so the generic "บันทึกแล้ว" toast would stack a
    // second toast on top of it.
    meta: { suppressSuccessToast: true },
  });
}

export function useRedisplayClassroomLink() {
  return useMutation({
    mutationFn: classroomLinksService.redisplay,
    meta: { suppressSuccessToast: true },
  });
}

export function useRotateClassroomLink() {
  const refresh = useRefreshClassroomLinks();
  return useMutation({
    mutationFn: classroomLinksService.rotate,
    onSuccess: refresh,
    meta: { suppressSuccessToast: true },
  });
}

export function useDeactivateClassroomLink() {
  const refresh = useRefreshClassroomLinks();
  return useMutation({
    mutationFn: classroomLinksService.deactivate,
    onSuccess: refresh,
    meta: { suppressSuccessToast: true },
  });
}

export function useResendClassroomLinkLine() {
  const refresh = useRefreshClassroomLinks();
  return useMutation({
    mutationFn: classroomLinksService.resendLine,
    onSuccess: refresh,
    meta: { suppressSuccessToast: true },
  });
}

export function useClassroomLineGroupInvitation(schoolId: number | null) {
  return useQuery({
    queryKey: [KEY, "line-group-invitation", schoolId],
    queryFn: () => classroomLinksService.getLineGroupInvitation(schoolId!),
    enabled: Boolean(schoolId),
  });
}

function useRefreshLineGroupInvitation() {
  const client = useQueryClient();
  return () =>
    client.invalidateQueries({ queryKey: [KEY, "line-group-invitation"] });
}

export function useIssueClassroomLineGroupInvitation() {
  const refresh = useRefreshLineGroupInvitation();
  return useMutation({
    mutationFn: classroomLinksService.issueLineGroupInvitation,
    onSuccess: refresh,
  });
}

export function useUpdateClassroomLineGroupInvitation() {
  const refresh = useRefreshLineGroupInvitation();
  return useMutation({
    mutationFn: classroomLinksService.updateLineGroupInvitation,
    onSuccess: refresh,
  });
}

export function useRevokeClassroomLineGroupInvitation() {
  const refresh = useRefreshLineGroupInvitation();
  return useMutation({
    mutationFn: classroomLinksService.revokeLineGroupInvitation,
    onSuccess: refresh,
  });
}
