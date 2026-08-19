import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import type { ClassroomStudentProblemCategory } from "../../school-structure/types/school-structure.types";
import {
  teacherAccessService,
  type TeacherAttendanceHistoryQuery,
} from "../api/teacher-access.service";
import {
  useTeacherLinkSessionStore,
  type TeacherLinkCredential,
} from "../store/teacher-link-session.store";
import type {
  IssueTeacherAccessGrantInput,
  IssueTeacherAttendanceDelegationInput,
  IssuePublicTeacherAttendanceDelegationInput,
  UpdatePublicTeacherAttendanceDelegationInput,
  UpdateTeacherAttendanceDelegationInput,
  TeacherLineFilter,
} from "../types/teacher-access.types";

const KEY = "teacher-access";

export function useTeacherLinkRoster(input: {
  schoolId?: number;
  schoolTermId?: number;
  search?: string;
  lineStatus?: TeacherLineFilter;
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
        lineStatus: input.lineStatus,
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
  return async () =>
    client.invalidateQueries({ queryKey: [KEY, "teacher-roster"] });
}

export function useIssueTeacherAccessGrant() {
  const invalidate = useRosterInvalidation();
  return useMutation({
    mutationFn: (input: IssueTeacherAccessGrantInput) =>
      teacherAccessService.issueGrant(input),
    onSuccess: invalidate,
    meta: { suppressSuccessToast: true },
  });
}

export function useTeacherAttendanceDelegationOptions(input: {
  schoolId?: number;
  schoolTermId?: number;
  classroomId?: number;
  attendanceDate?: string;
  enabled?: boolean;
}) {
  return useQuery({
    queryKey: [KEY, "attendance-delegation-options", input],
    queryFn: () =>
      teacherAccessService.getAttendanceDelegationOptions({
        schoolId: input.schoolId!,
        schoolTermId: input.schoolTermId!,
        classroomId: input.classroomId!,
        attendanceDate: input.attendanceDate!,
      }),
    enabled: Boolean(
      input.enabled !== false &&
      input.schoolId &&
      input.schoolTermId &&
      input.classroomId &&
      input.attendanceDate,
    ),
  });
}

export function useIssueTeacherAttendanceDelegation() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: IssueTeacherAttendanceDelegationInput) =>
      teacherAccessService.issueAttendanceDelegation(input),
    onSuccess: () =>
      client.invalidateQueries({
        queryKey: [KEY, "attendance-delegation-options"],
      }),
    meta: { suppressSuccessToast: true },
  });
}

export function usePublicTeacherAttendanceDelegationOptions(
  credential: TeacherLinkCredential | undefined,
  input: { assignmentId?: number; attendanceDate?: string },
  enabled: boolean,
) {
  return useQuery({
    queryKey: [
      ...(credential
        ? teacherAccessGuestQueryKey(credential.token)
        : [KEY, "guest", "none"]),
      "attendance-delegation-options",
      input.assignmentId,
      input.attendanceDate,
    ],
    queryFn: () =>
      teacherAccessService.getPublicAttendanceDelegationOptions(credential!, {
        assignmentId: input.assignmentId!,
        attendanceDate: input.attendanceDate!,
      }),
    enabled: Boolean(
      enabled &&
      credential?.token &&
      input.assignmentId &&
      input.attendanceDate,
    ),
    retry: false,
    gcTime: 0,
  });
}

export function useIssuePublicTeacherAttendanceDelegation(
  credential: TeacherLinkCredential | undefined,
) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: IssuePublicTeacherAttendanceDelegationInput) =>
      teacherAccessService.issuePublicAttendanceDelegation(credential!, input),
    onSuccess: () => client.invalidateQueries({ queryKey: [KEY, "guest"] }),
    meta: { suppressSuccessToast: true },
    gcTime: 0,
  });
}

export function useUpdateTeacherAttendanceDelegation() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateTeacherAttendanceDelegationInput) =>
      teacherAccessService.updateAttendanceDelegation(input),
    onSuccess: () =>
      client.invalidateQueries({
        queryKey: [KEY, "attendance-delegation-options"],
      }),
    meta: { successMessage: "แก้ไขลิงก์เช็กชื่อแล้ว" },
  });
}

export function useRevokeTeacherAttendanceDelegation() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ grantId }: { grantId: string }) =>
      teacherAccessService.revokeAttendanceDelegation(grantId),
    onSuccess: async () => {
      await Promise.all([
        client.invalidateQueries({
          queryKey: [KEY, "attendance-delegation-options"],
        }),
        client.invalidateQueries({ queryKey: [KEY, "teacher-roster"] }),
      ]);
    },
    meta: { successMessage: "ปิดลิงก์เช็กชื่อแล้ว" },
  });
}

export function useUpdatePublicTeacherAttendanceDelegation(
  credential: TeacherLinkCredential | undefined,
) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdatePublicTeacherAttendanceDelegationInput) =>
      teacherAccessService.updatePublicAttendanceDelegation(credential!, input),
    onSuccess: () => client.invalidateQueries({ queryKey: [KEY, "guest"] }),
    meta: { successMessage: "แก้ไขลิงก์เช็กชื่อแล้ว" },
    gcTime: 0,
  });
}

export function useRevokePublicTeacherAttendanceDelegation(
  credential: TeacherLinkCredential | undefined,
) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: { grantId: string; assignmentId: number }) =>
      teacherAccessService.revokePublicAttendanceDelegation(credential!, input),
    onSuccess: () => client.invalidateQueries({ queryKey: [KEY, "guest"] }),
    meta: { successMessage: "ปิดลิงก์เช็กชื่อแล้ว" },
    gcTime: 0,
  });
}

export function useIssueTeacherAccessGrantsForTerm() {
  const invalidate = useRosterInvalidation();
  return useMutation({
    mutationFn: teacherAccessService.issueGrantsForTerm,
    onSuccess: invalidate,
  });
}

export function useSendTeacherAccessGrantsOverLine() {
  const invalidate = useRosterInvalidation();
  return useMutation({
    mutationFn: teacherAccessService.sendGrantsOverLine,
    onSuccess: invalidate,
  });
}

export function useUnlinkTeacherLineAccount() {
  const invalidate = useRosterInvalidation();
  return useMutation({
    mutationFn: teacherAccessService.unlinkTeacherLineAccount,
    onSuccess: invalidate,
  });
}

export function useTeacherLineGroupInvitation(schoolId?: number) {
  const query = useQuery({
    queryKey: [KEY, "line-group-invitation", schoolId],
    queryFn: () =>
      teacherAccessService.getTeacherLineGroupInvitation(schoolId!),
    enabled: Boolean(schoolId),
  });
  const expiresAt = query.data?.expiresAt;
  const refetch = query.refetch;

  useEffect(() => {
    if (!expiresAt) return;
    let timer: number | undefined;
    const refreshAtExpiry = (): void => {
      const remainingMs = new Date(expiresAt).getTime() - Date.now();
      if (remainingMs <= 0) {
        void refetch();
        return;
      }
      timer = window.setTimeout(
        refreshAtExpiry,
        Math.min(remainingMs + 100, 86_400_000),
      );
    };
    refreshAtExpiry();
    return () => window.clearTimeout(timer);
  }, [expiresAt, refetch]);

  return query;
}

export function useIssueTeacherLineGroupInvitation() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: teacherAccessService.issueTeacherLineGroupInvitation,
    onSuccess: () =>
      client.invalidateQueries({ queryKey: [KEY, "line-group-invitation"] }),
  });
}

export function useUpdateTeacherLineGroupInvitation() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: teacherAccessService.updateTeacherLineGroupInvitation,
    onSuccess: () =>
      client.invalidateQueries({ queryKey: [KEY, "line-group-invitation"] }),
  });
}

export function useRevokeTeacherLineGroupInvitation() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: teacherAccessService.revokeTeacherLineGroupInvitation,
    onSuccess: () =>
      client.invalidateQueries({ queryKey: [KEY, "line-group-invitation"] }),
  });
}

export function useTeacherAccessGrantLink() {
  return useMutation({
    mutationFn: teacherAccessService.getGrantLink,
    meta: { suppressSuccessToast: true },
  });
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
    meta: { suppressSuccessToast: true },
  });
}

/** Guest-side query key namespace — never cached beyond the current visit. */
export const teacherAccessGuestQueryKey = (token: string) =>
  [KEY, "guest", token.slice(-8)] as const;

export function useTeacherAccessContext(credential: TeacherLinkCredential) {
  return useQuery({
    queryKey: [
      ...teacherAccessGuestQueryKey(credential.token),
      "context",
      credential.sessionToken,
    ],
    queryFn: () => teacherAccessService.getContext(credential),
    enabled: Boolean(credential.token),
    retry: false,
    gcTime: 0,
  });
}

export function useRequestTeacherAccessOtp() {
  return useMutation({
    mutationFn: (token: string) => teacherAccessService.requestOtp(token),
    meta: { suppressSuccessToast: true },
  });
}

export function useVerifyTeacherAccessOtp() {
  return useMutation({
    mutationFn: ({ token, otp }: { token: string; otp: string }) =>
      teacherAccessService.verifyOtp(token, otp),
    meta: { suppressSuccessToast: true },
  });
}

export function useCreateTeacherAccessAraIdChallenge() {
  return useMutation({
    mutationFn: teacherAccessService.createAraIdChallenge,
    meta: { suppressSuccessToast: true },
  });
}

export function useApproveTeacherAccessAraIdChallenge() {
  return useMutation({
    mutationFn: teacherAccessService.approveAraIdChallenge,
    meta: { suppressSuccessToast: true },
  });
}

export function useBeginTeacherAccessAraIdChallenge() {
  return useMutation({
    mutationFn: teacherAccessService.beginAraIdChallenge,
    meta: { suppressSuccessToast: true },
  });
}

export function useTeacherAccessAraIdChallengeStatus(challengeToken: string) {
  return useQuery({
    queryKey: [KEY, "araid-challenge", challengeToken.slice(-8)],
    queryFn: () => teacherAccessService.pollAraIdChallenge(challengeToken),
    enabled: Boolean(challengeToken),
    retry: false,
    refetchInterval: (query) =>
      query.state.data?.status === "APPROVED" ? false : 1_500,
    gcTime: 0,
  });
}

export function useTeacherAccessRoster(
  credential: TeacherLinkCredential,
  assignmentId?: number,
) {
  return useQuery({
    queryKey: [
      ...teacherAccessGuestQueryKey(credential.token),
      "roster",
      assignmentId,
    ],
    queryFn: () =>
      teacherAccessService.getCompleteRoster(credential, assignmentId!),
    enabled: Boolean(credential.token && assignmentId),
    retry: false,
    gcTime: 0,
  });
}

export function useTeacherAccessAttendanceSlots(
  credential: TeacherLinkCredential,
  assignmentId: number | undefined,
  date: string,
  enabled: boolean,
) {
  return useQuery({
    queryKey: [
      ...teacherAccessGuestQueryKey(credential.token),
      "attendance-slots",
      assignmentId,
      date,
    ],
    queryFn: () =>
      teacherAccessService.listAttendanceSlots(credential, {
        assignmentId: assignmentId!,
        date,
      }),
    enabled: Boolean(enabled && credential.token && assignmentId && date),
    retry: false,
    gcTime: 0,
  });
}

export function useTeacherAttendanceHistory(
  credential: TeacherLinkCredential,
  assignmentId: number | undefined,
  page: number,
  limit: number,
  filters: Omit<TeacherAttendanceHistoryQuery, "assignmentId">,
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

/** Per-student totals of the same history. */
export function useTeacherAttendanceHistoryStudents(
  credential: TeacherLinkCredential,
  assignmentId: number | undefined,
  page: number,
  limit: number,
  filters: Omit<TeacherAttendanceHistoryQuery, "assignmentId">,
  enabled: boolean,
) {
  return useQuery({
    queryKey: [
      ...teacherAccessGuestQueryKey(credential.token),
      "attendance-history-students",
      assignmentId,
      page,
      limit,
      filters,
    ],
    queryFn: () =>
      teacherAccessService.listAttendanceHistoryStudents(credential, {
        assignmentId: assignmentId!,
        page,
        limit,
        ...filters,
      }),
    enabled: Boolean(enabled && credential.token && assignmentId),
    retry: false,
    gcTime: 0,
  });
}

/** One student's days, opened from either view. */
export function useTeacherAttendanceHistoryStudentDays(
  credential: TeacherLinkCredential,
  assignmentId: number | undefined,
  studentUuid: string | undefined,
  page: number,
  limit: number,
  filters: Omit<TeacherAttendanceHistoryQuery, "assignmentId" | "studentUuid">,
) {
  return useQuery({
    queryKey: [
      ...teacherAccessGuestQueryKey(credential.token),
      "attendance-history-student-days",
      assignmentId,
      studentUuid,
      page,
      limit,
      filters,
    ],
    queryFn: () =>
      teacherAccessService.listAttendanceHistoryStudentDays(credential, {
        assignmentId: assignmentId!,
        studentUuid: studentUuid!,
        page,
        limit,
        ...filters,
      }),
    enabled: Boolean(credential.token && assignmentId && studentUuid),
    retry: false,
    gcTime: 0,
  });
}

/** ประวัติการมอบหมาย for the staff screen. */
export function useStaffAttendanceDelegationHistory(
  input: {
    schoolId?: number;
    classroomId?: number | null;
    subjectId?: number;
    page: number;
    limit: number;
    attendanceDate?: string;
    search?: string;
    sortBy?: "date" | "issuedBy" | "teacher" | "status";
    sortDirection?: "asc" | "desc";
  },
  enabled: boolean,
) {
  return useQuery({
    queryKey: [KEY, "delegation-history", input],
    queryFn: () =>
      teacherAccessService.listStaffAttendanceDelegationHistory({
        ...input,
        schoolId: input.schoolId!,
        classroomId: input.classroomId!,
      }),
    enabled: Boolean(enabled && input.schoolId && input.classroomId),
  });
}

/** The same history through a teacher link. */
export function useTeacherAttendanceDelegationHistory(
  credential: TeacherLinkCredential,
  assignmentId: number | undefined,
  input: {
    page: number;
    limit: number;
    attendanceDate?: string;
    search?: string;
    sortBy?: "date" | "issuedBy" | "teacher" | "status";
    sortDirection?: "asc" | "desc";
  },
  enabled: boolean,
) {
  return useQuery({
    queryKey: [
      ...teacherAccessGuestQueryKey(credential.token),
      "delegation-history",
      assignmentId,
      input,
    ],
    queryFn: () =>
      teacherAccessService.listAttendanceDelegationHistory(credential, {
        ...input,
        assignmentId: assignmentId!,
      }),
    enabled: Boolean(enabled && credential.token && assignmentId),
    retry: false,
    gcTime: 0,
  });
}

/** ประวัติการนำเข้าไฟล์ of the class the link opens. */
export function useTeacherAttendanceImports(
  credential: TeacherLinkCredential,
  assignmentId: number | undefined,
  input: {
    page: number;
    limit: number;
    attendanceDate?: string;
    search?: string;
  },
  enabled: boolean,
) {
  return useQuery({
    queryKey: [
      ...teacherAccessGuestQueryKey(credential.token),
      "attendance-imports",
      assignmentId,
      input,
    ],
    queryFn: () =>
      teacherAccessService.listAttendanceImports(credential, {
        ...input,
        assignmentId: assignmentId!,
      }),
    enabled: Boolean(enabled && credential.token && assignmentId),
    retry: false,
    gcTime: 0,
  });
}

export function useCreateTeacherStudentComment(assignmentId: number) {
  const token = useTeacherLinkSessionStore((state) => state.token);
  const sessionToken = useTeacherLinkSessionStore(
    (state) => state.sessionToken,
  );
  return useMutation({
    mutationFn: (input: {
      studentUuid: string;
      problemCategory: ClassroomStudentProblemCategory;
      problemDescription: string;
    }) =>
      teacherAccessService.createStudentComment(
        { token, sessionToken },
        { assignmentId, ...input },
      ),
    gcTime: 0,
  });
}

export function useTeacherSchedule(enabled = true) {
  const token = useTeacherLinkSessionStore((state) => state.token);
  const sessionToken = useTeacherLinkSessionStore(
    (state) => state.sessionToken,
  );
  return useQuery({
    queryKey: [...teacherAccessGuestQueryKey(token), "my-schedule"],
    queryFn: () => teacherAccessService.getMySchedule({ token, sessionToken }),
    enabled: Boolean(enabled && token),
    gcTime: 0,
  });
}

export function useTeacherStudentProfile(
  assignmentId: number,
  studentUuid: string,
) {
  const token = useTeacherLinkSessionStore((state) => state.token);
  const sessionToken = useTeacherLinkSessionStore(
    (state) => state.sessionToken,
  );
  return useQuery({
    queryKey: [
      ...teacherAccessGuestQueryKey(token),
      "student-profile",
      assignmentId,
      studentUuid,
    ],
    queryFn: () =>
      teacherAccessService.getStudentProfile(
        { token, sessionToken },
        { assignmentId, studentUuid },
      ),
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
  const sessionToken = useTeacherLinkSessionStore(
    (state) => state.sessionToken,
  );
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
  const sessionToken = useTeacherLinkSessionStore(
    (state) => state.sessionToken,
  );
  return useQuery({
    queryKey: [...teacherAccessGuestQueryKey(token), "cover", classroomId],
    queryFn: () =>
      teacherAccessService.getClassroomCoverBlob(
        { token, sessionToken },
        assignmentId,
      ),
    enabled: Boolean(token && hasCoverImage),
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
}

export function useTeacherOwnPhoto(hasPhoto: boolean) {
  const token = useTeacherLinkSessionStore((state) => state.token);
  const sessionToken = useTeacherLinkSessionStore(
    (state) => state.sessionToken,
  );
  return useQuery({
    queryKey: [...teacherAccessGuestQueryKey(token), "own-photo"],
    queryFn: () =>
      teacherAccessService.getOwnPhotoBlob({ token, sessionToken }),
    enabled: Boolean(token && hasPhoto),
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
}

export function useTeacherStudentPhoto(
  assignmentId: number | undefined,
  studentUuid: string | undefined,
  hasPhoto: boolean,
) {
  const token = useTeacherLinkSessionStore((state) => state.token);
  const sessionToken = useTeacherLinkSessionStore(
    (state) => state.sessionToken,
  );
  return useQuery({
    queryKey: [
      ...teacherAccessGuestQueryKey(token),
      "student-photo",
      assignmentId,
      studentUuid,
    ],
    queryFn: () =>
      teacherAccessService.getStudentPhotoBlob(
        { token, sessionToken },
        { assignmentId: assignmentId!, studentUuid: studentUuid! },
      ),
    enabled: Boolean(token && assignmentId && studentUuid && hasPhoto),
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
}

export function useRecordTeacherClassroomExport() {
  const token = useTeacherLinkSessionStore((state) => state.token);
  const sessionToken = useTeacherLinkSessionStore(
    (state) => state.sessionToken,
  );
  return useMutation({
    mutationFn: (input: {
      assignmentId: number;
      exportScope: "ROSTER" | "ATTENDANCE";
      format: string;
      columns: string[];
      dateFrom?: string;
      dateTo?: string;
    }) =>
      teacherAccessService.recordClassroomExport(
        { token, sessionToken },
        input,
      ),
    gcTime: 0,
  });
}

export function useUpdateTeacherClassroomCover() {
  const client = useQueryClient();
  const token = useTeacherLinkSessionStore((state) => state.token);
  const sessionToken = useTeacherLinkSessionStore(
    (state) => state.sessionToken,
  );
  return useMutation({
    mutationFn: (
      input: Parameters<typeof teacherAccessService.updateClassroomCard>[1],
    ) =>
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

export function useSaveTeacherAccessAttendance(
  credential: TeacherLinkCredential,
) {
  return useMutation({
    mutationFn: (
      input: Parameters<typeof teacherAccessService.saveAttendance>[1],
    ) => teacherAccessService.saveAttendance(credential, input),
    gcTime: 0,
  });
}

/**
 * Round state for the teacher-link check-in: which marks are already stored and
 * whether the round is still open. Without it the link page could not prefill
 * earlier work or stop a second submit.
 */
export function useTeacherAccessAttendanceSession(
  credential: TeacherLinkCredential,
  query: { assignmentId?: number; date: string; timetableSlotId?: number },
  enabled: boolean,
) {
  return useQuery({
    queryKey: [
      ...teacherAccessGuestQueryKey(credential.token),
      "attendance-session",
      query.assignmentId,
      query.date,
      query.timetableSlotId ?? "none",
    ],
    queryFn: () =>
      teacherAccessService.getAttendanceSession(credential, {
        assignmentId: query.assignmentId as number,
        date: query.date,
        ...(query.timetableSlotId
          ? { timetableSlotId: query.timetableSlotId }
          : {}),
      }),
    enabled: Boolean(enabled && credential.token && query.assignmentId),
    retry: false,
    gcTime: 0,
  });
}

export function useTeacherAccessAttendanceCalendar(
  credential: TeacherLinkCredential,
  query: { assignmentId?: number; date: string },
  enabled: boolean,
) {
  return useQuery({
    queryKey: [
      ...teacherAccessGuestQueryKey(credential.token),
      "attendance-calendar",
      query.assignmentId,
      query.date,
    ],
    queryFn: () =>
      teacherAccessService.getAttendanceCalendar(credential, {
        assignmentId: query.assignmentId as number,
        date: query.date,
      }),
    enabled: Boolean(enabled && credential.token && query.assignmentId),
    retry: false,
    gcTime: 0,
  });
}
