import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { teacherAccessService } from "../api/teacher-access.service";
import type {
  IssueTeacherAccessGrantInput,
  TeacherAccessGrantStatus,
} from "../types/teacher-access.types";

const KEY = "teacher-access";

export function useTeacherAccessGrants(input: {
  schoolId?: number;
  schoolTermId?: number;
  status?: TeacherAccessGrantStatus;
  page: number;
  limit: number;
}) {
  return useQuery({
    queryKey: [
      KEY,
      "grants",
      input.schoolId,
      input.schoolTermId,
      input.status,
      input.page,
      input.limit,
    ],
    queryFn: () =>
      teacherAccessService.listGrants({
        schoolId: input.schoolId!,
        schoolTermId: input.schoolTermId,
        status: input.status,
        page: input.page,
        limit: input.limit,
      }),
    enabled: Boolean(input.schoolId),
  });
}

export function useTeacherAssignmentOptions(input: {
  schoolId?: number;
  schoolTermId?: number;
  teacherMembershipId?: number;
}) {
  return useQuery({
    queryKey: [
      KEY,
      "assignment-options",
      input.schoolId,
      input.schoolTermId,
      input.teacherMembershipId,
    ],
    queryFn: () =>
      teacherAccessService.listAssignmentOptions({
        schoolId: input.schoolId!,
        schoolTermId: input.schoolTermId!,
        teacherMembershipId: input.teacherMembershipId!,
      }),
    enabled: Boolean(input.schoolId && input.schoolTermId && input.teacherMembershipId),
  });
}

export function useIssueTeacherAccessGrant() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: IssueTeacherAccessGrantInput) => teacherAccessService.issueGrant(input),
    onSuccess: async () => client.invalidateQueries({ queryKey: [KEY, "grants"] }),
  });
}

export function useRevokeTeacherAccessGrant() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ grantId, reason }: { grantId: string; reason: string }) =>
      teacherAccessService.revokeGrant(grantId, reason),
    onSuccess: async () => client.invalidateQueries({ queryKey: [KEY, "grants"] }),
  });
}

export function useRotateTeacherAccessGrant() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: teacherAccessService.rotateGrant,
    onSuccess: async () => client.invalidateQueries({ queryKey: [KEY, "grants"] }),
  });
}

export interface TeacherAccessGuestCredential {
  token: string;
  cacheIdentity: string;
}

export const teacherAccessGuestQueryKey = (cacheIdentity: string) =>
  [KEY, "guest", cacheIdentity] as const;

export function useTeacherAccessContext(credential: TeacherAccessGuestCredential | null) {
  return useQuery({
    queryKey: [...teacherAccessGuestQueryKey(credential?.cacheIdentity ?? "pending"), "context"],
    queryFn: () => teacherAccessService.getContext(credential!.token),
    enabled: Boolean(credential?.token),
    retry: false,
    gcTime: 0,
  });
}

export function useTeacherAccessRoster(
  credential: TeacherAccessGuestCredential | null,
  assignmentId?: number,
) {
  return useQuery({
    queryKey: [
      ...teacherAccessGuestQueryKey(credential?.cacheIdentity ?? "pending"),
      "roster",
      assignmentId,
    ],
    queryFn: () => teacherAccessService.getCompleteRoster(credential!.token, assignmentId!),
    enabled: Boolean(credential?.token && assignmentId),
    retry: false,
    gcTime: 0,
  });
}

export function useSaveTeacherAccessAttendance(
  credential: TeacherAccessGuestCredential | null,
) {
  return useMutation({
    mutationFn: (input: Parameters<typeof teacherAccessService.saveAttendance>[1]) =>
      teacherAccessService.saveAttendance(credential!.token, input),
    gcTime: 0,
  });
}
