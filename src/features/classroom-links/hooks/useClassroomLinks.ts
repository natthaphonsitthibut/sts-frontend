import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { classroomLinksService } from "../api/classroom-links.service";
import { checkInService } from "../../check-in/api/check-in.service";
import type { CheckInAccess } from "../../check-in/types/check-in.types";
import type {
  AttendanceAssignmentPayload,
  ClassroomLinkListParams,
  MyAssignmentLinkParams,
} from "../types/classroom-links.types";

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
  return () =>
    Promise.all([
      client.invalidateQueries({ queryKey: [KEY, "list"] }),
      client.invalidateQueries({ queryKey: [KEY, "mine"] }),
    ]);
}

/**
 * Creates an assignment link from wherever the teacher is standing.
 *
 * The admin page posts as an authenticated user; a teacher inside their own
 * link has no account and posts through the link's namespace, which proves the
 * subject is theirs before handing it on. Same act, two doors.
 */
export function useCreateAttendanceAssignment(
  access: CheckInAccess = "INTERNAL",
) {
  const refresh = useRefreshClassroomLinks();
  return useMutation({
    mutationFn: (input: AttendanceAssignmentPayload) =>
      access === "INTERNAL"
        ? classroomLinksService.createAssignment(input)
        : checkInService.createAssignment({
            classroomSubjectId: input.classroomSubjectId,
            opensAt: input.opensAt,
            expiresAt: input.expiresAt,
          }),
    onSuccess: refresh,
    meta: { suppressSuccessToast: true },
  });
}

/**
 * The assignments the person looking issued, and the actions on one of them.
 *
 * Keyed by `access` as well as the filter: the staff screen and a teacher's own
 * link are different registers of the same kind of link, and one must never be
 * served from the other's cache.
 */
export function useMyAssignmentLinks(
  access: CheckInAccess,
  params: MyAssignmentLinkParams | null,
) {
  return useQuery({
    queryKey: [KEY, "mine", access, params],
    queryFn: () => classroomLinksService.listMyAssignments(access, params!),
    enabled: Boolean(params),
  });
}

export function useMyAssignmentUsage(
  access: CheckInAccess,
  linkId: string | null,
) {
  return useQuery({
    queryKey: [KEY, "mine-usage", access, linkId],
    queryFn: () => classroomLinksService.getMyAssignmentUsage(access, linkId!),
    enabled: Boolean(linkId),
  });
}

function useRefreshMyAssignments() {
  const client = useQueryClient();
  return () => client.invalidateQueries({ queryKey: [KEY, "mine"] });
}

/** Reads the link back out to share again. Nothing changes; the token stands. */
export function useMyAssignmentUrl(access: CheckInAccess) {
  return useMutation({
    mutationFn: (linkId: string) =>
      classroomLinksService.getMyAssignmentUrl(access, linkId),
    meta: { suppressSuccessToast: true },
  });
}

/** A new token: whoever holds the old link is locked out from this moment. */
export function useRotateMyAssignment(access: CheckInAccess) {
  const refresh = useRefreshMyAssignments();
  return useMutation({
    mutationFn: (linkId: string) =>
      classroomLinksService.rotateMyAssignment(access, linkId),
    onSuccess: refresh,
    meta: { suppressSuccessToast: true },
  });
}

export function useDeactivateMyAssignment(access: CheckInAccess) {
  const refresh = useRefreshMyAssignments();
  return useMutation({
    mutationFn: (linkId: string) =>
      classroomLinksService.deactivateMyAssignment(access, linkId),
    onSuccess: refresh,
    meta: { suppressSuccessToast: true },
  });
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
    // Without this the generic "บันทึกแล้ว" answered a request to create a
    // link. Issuing a link reads the same way wherever it happens:
    // "สร้างลิงก์<ชื่อลิงก์>แล้ว".
    meta: { successMessage: "สร้างลิงก์ยืนยัน LINE แล้ว" },
  });
}

export function useUpdateClassroomLineGroupInvitation() {
  const refresh = useRefreshLineGroupInvitation();
  return useMutation({
    mutationFn: classroomLinksService.updateLineGroupInvitation,
    onSuccess: refresh,
    meta: { successMessage: "แก้ไขวันเวลาลิงก์ยืนยัน LINE แล้ว" },
  });
}

export function useRevokeClassroomLineGroupInvitation() {
  const refresh = useRefreshLineGroupInvitation();
  return useMutation({
    mutationFn: classroomLinksService.revokeLineGroupInvitation,
    onSuccess: refresh,
    meta: { successMessage: "ปิดลิงก์ยืนยัน LINE แล้ว" },
  });
}
