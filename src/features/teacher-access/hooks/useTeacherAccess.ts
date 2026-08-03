import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { teacherAccessService } from "../api/teacher-access.service";
import {
  useTeacherLinkSessionStore,
  type TeacherLinkCredential,
} from "../store/teacher-link-session.store";
import type { IssueTeacherAccessGrantInput } from "../types/teacher-access.types";

const KEY = "teacher-access";

export function useTeacherLinkRoster(input: {
  schoolId?: number;
  schoolTermId?: number;
  search?: string;
  sortBy?: "name" | "linkStatus";
  sortOrder?: "asc" | "desc";
  page: number;
  limit: number;
}) {
  return useQuery({
    queryKey: [KEY, "teacher-roster", input],
    queryFn: () =>
      teacherAccessService.listTeacherRoster({
        schoolId: input.schoolId!,
        schoolTermId: input.schoolTermId!,
        search: input.search || undefined,
        sortBy: input.sortBy,
        sortOrder: input.sortOrder,
        page: input.page,
        limit: input.limit,
      }),
    enabled: Boolean(input.schoolId && input.schoolTermId),
  });
}

function useRosterInvalidation() {
  const client = useQueryClient();
  return async () => client.invalidateQueries({ queryKey: [KEY, "teacher-roster"] });
}

export function useIssueTeacherAccessGrant() {
  const invalidate = useRosterInvalidation();
  return useMutation({
    mutationFn: (input: IssueTeacherAccessGrantInput) => teacherAccessService.issueGrant(input),
    onSuccess: invalidate,
  });
}

export function useIssueTeacherAccessGrantsForTerm() {
  const invalidate = useRosterInvalidation();
  return useMutation({
    mutationFn: (schoolTermId: number) => teacherAccessService.issueGrantsForTerm(schoolTermId),
    onSuccess: invalidate,
  });
}

export function useTeacherAccessGrantLink() {
  return useMutation({ mutationFn: teacherAccessService.getGrantLink });
}

export function useRevokeTeacherAccessGrant() {
  const invalidate = useRosterInvalidation();
  return useMutation({
    mutationFn: ({ grantId, reason }: { grantId: string; reason: string }) =>
      teacherAccessService.revokeGrant(grantId, reason),
    onSuccess: invalidate,
  });
}

export function useRotateTeacherAccessGrant() {
  const invalidate = useRosterInvalidation();
  return useMutation({
    mutationFn: teacherAccessService.rotateGrant,
    onSuccess: invalidate,
  });
}

/** Guest-side query key namespace — never cached beyond the current visit. */
export const teacherAccessGuestQueryKey = (token: string) =>
  [KEY, "guest", token.slice(-8)] as const;

export function useTeacherAccessContext(credential: TeacherLinkCredential) {
  return useQuery({
    queryKey: [...teacherAccessGuestQueryKey(credential.token), "context", credential.sessionToken],
    queryFn: () => teacherAccessService.getContext(credential),
    enabled: Boolean(credential.token),
    retry: false,
    gcTime: 0,
  });
}

export function useRequestTeacherAccessOtp() {
  return useMutation({ mutationFn: (token: string) => teacherAccessService.requestOtp(token) });
}

export function useVerifyTeacherAccessOtp() {
  return useMutation({
    mutationFn: ({ token, otp }: { token: string; otp: string }) =>
      teacherAccessService.verifyOtp(token, otp),
  });
}

export function useTeacherAccessRoster(credential: TeacherLinkCredential, assignmentId?: number) {
  return useQuery({
    queryKey: [...teacherAccessGuestQueryKey(credential.token), "roster", assignmentId],
    queryFn: () => teacherAccessService.getCompleteRoster(credential, assignmentId!),
    enabled: Boolean(credential.token && assignmentId),
    retry: false,
    gcTime: 0,
  });
}

export function useTeacherAttendanceHistory(
  credential: TeacherLinkCredential,
  assignmentId: number | undefined,
  page: number,
  limit: number,
  filters: {
    search?: string;
    attendanceDate?: string;
    sortBy?: "date" | "recordedBy" | "present" | "late" | "leave" | "absent";
    sortOrder?: "asc" | "desc";
  },
) {
  return useQuery({
    queryKey: [
      ...teacherAccessGuestQueryKey(credential.token),
      "attendance-history",
      assignmentId,
      page,
      limit,
      filters,
    ],
    queryFn: () =>
      teacherAccessService.listAttendanceHistory(credential, {
        assignmentId: assignmentId!,
        page,
        limit,
        ...filters,
      }),
    enabled: Boolean(credential.token && assignmentId),
    retry: false,
    gcTime: 0,
  });
}

export function useCreateTeacherStudentComment(assignmentId: number) {
  const token = useTeacherLinkSessionStore((state) => state.token);
  const sessionToken = useTeacherLinkSessionStore((state) => state.sessionToken);
  return useMutation({
    mutationFn: (input: { studentUuid: string; commentText: string }) =>
      teacherAccessService.createStudentComment(
        { token, sessionToken },
        { assignmentId, ...input },
      ),
    gcTime: 0,
  });
}

export function useTeacherStudentProfile(assignmentId: number, studentUuid: string) {
  const token = useTeacherLinkSessionStore((state) => state.token);
  const sessionToken = useTeacherLinkSessionStore((state) => state.sessionToken);
  return useQuery({
    queryKey: [...teacherAccessGuestQueryKey(token), "student-profile", assignmentId, studentUuid],
    queryFn: () =>
      teacherAccessService.getStudentProfile({ token, sessionToken }, { assignmentId, studentUuid }),
    enabled: Boolean(token && assignmentId && studentUuid),
    retry: false,
    gcTime: 0,
  });
}

export function useTeacherStudentSubjectAttendance(
  assignmentId: number | undefined,
  studentUuid: string | undefined,
  date: string | undefined,
) {
  const token = useTeacherLinkSessionStore((state) => state.token);
  const sessionToken = useTeacherLinkSessionStore((state) => state.sessionToken);
  return useQuery({
    queryKey: [
      ...teacherAccessGuestQueryKey(token),
      "student-subject-attendance",
      assignmentId,
      studentUuid,
      date,
    ],
    queryFn: () =>
      teacherAccessService.getStudentSubjectAttendance(
        { token, sessionToken },
        { assignmentId: assignmentId!, studentUuid: studentUuid!, date: date! },
      ),
    enabled: Boolean(token && assignmentId && studentUuid && date),
    retry: false,
    gcTime: 0,
  });
}

export function useTeacherClassroomCover(
  assignmentId: number,
  classroomId: string,
  hasCoverImage: boolean,
) {
  const token = useTeacherLinkSessionStore((state) => state.token);
  const sessionToken = useTeacherLinkSessionStore((state) => state.sessionToken);
  return useQuery({
    queryKey: [...teacherAccessGuestQueryKey(token), "cover", classroomId],
    queryFn: () =>
      teacherAccessService.getClassroomCoverBlob({ token, sessionToken }, assignmentId),
    enabled: Boolean(token && hasCoverImage),
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
}

export function useRecordTeacherClassroomExport() {
  const token = useTeacherLinkSessionStore((state) => state.token);
  const sessionToken = useTeacherLinkSessionStore((state) => state.sessionToken);
  return useMutation({
    mutationFn: (input: {
      assignmentId: number;
      exportScope: "ROSTER" | "ATTENDANCE";
      format: string;
      columns: string[];
      dateFrom?: string;
      dateTo?: string;
    }) => teacherAccessService.recordClassroomExport({ token, sessionToken }, input),
    gcTime: 0,
  });
}

export function useUpdateTeacherClassroomCover() {
  const client = useQueryClient();
  const token = useTeacherLinkSessionStore((state) => state.token);
  const sessionToken = useTeacherLinkSessionStore((state) => state.sessionToken);
  return useMutation({
    mutationFn: (input: Parameters<typeof teacherAccessService.updateClassroomCard>[1]) =>
      teacherAccessService.updateClassroomCard({ token, sessionToken }, input),
    onSuccess: async () => {
      await Promise.all([
        client.invalidateQueries({
          queryKey: [...teacherAccessGuestQueryKey(token), "context"],
        }),
        client.invalidateQueries({
          queryKey: [...teacherAccessGuestQueryKey(token), "cover"],
        }),
      ]);
    },
    gcTime: 0,
  });
}

export function useSaveTeacherAccessAttendance(credential: TeacherLinkCredential) {
  return useMutation({
    mutationFn: (input: Parameters<typeof teacherAccessService.saveAttendance>[1]) =>
      teacherAccessService.saveAttendance(credential, input),
    gcTime: 0,
  });
}
