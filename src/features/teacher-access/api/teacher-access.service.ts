import { apiClient } from "../../../lib/api-client";
import { getApiErrorMessage } from "../../../lib/api-error";
import type { AttendanceImportHistoryEntry } from "../../attendance/components/AttendanceImportHistoryTable";
import type { AttendanceSelectionStatus } from "../../attendance/types/attendance.types";
import type { AttendanceImportSheet } from "../../attendance/lib/attendance-import";
import type { ClassroomStudentProblemCategory } from "../../school-structure/types/school-structure.types";
import type { TeacherLinkCredential } from "../store/teacher-link-session.store";
import type {
  BulkIssueTeacherAccessResult,
  IssueTeacherAccessGrantsForTermInput,
  SendTeacherAccessGrantsInput,
  SendTeacherAccessGrantsResult,
  IssueTeacherAccessGrantInput,
  PaginationMeta,
  TeacherAccessAssignment,
  TeacherAccessAraIdChallenge,
  TeacherAccessAraIdChallengeStatus,
  TeacherAccessAttendanceSlot,
  TeacherAccessContext,
  TeacherAccessGrant,
  TeacherAccessGrantStatus,
  TeacherAccessOtpChallenge,
  TeacherAccessRosterStudent,
  TeacherAttendanceDelegationHistoryEntry,
  TeacherAttendanceHistoryEntry,
  TeacherAttendanceHistoryStudent,
  TeacherAttendanceHistoryStudentDay,
  TeacherLineFilter,
  TeacherLineGroupInvitationIssueResult,
  TeacherLineGroupInvitationSummary,
  TeacherLinkRosterEntry,
  TeacherAttendanceDelegationOptions,
  IssueTeacherAttendanceDelegationInput,
  IssuePublicTeacherAttendanceDelegationInput,
  UpdatePublicTeacherAttendanceDelegationInput,
  UpdateTeacherAttendanceDelegationInput,
  TeacherScheduleResponse,
  TeacherStudentProfile,
  TeacherAccessAttendanceSession,
  TeacherAccessAttendanceCalendar,
} from "../types/teacher-access.types";

interface DataEnvelope<T> {
  data: T;
}

interface PaginatedEnvelope<T> extends DataEnvelope<T[]> {
  meta: PaginationMeta;
}

const TOKEN_HEADER = "x-teacher-access-token";
const SESSION_HEADER = "x-teacher-access-session";
const ARAID_CHALLENGE_HEADER = "x-teacher-access-araid-challenge";

/** Marks a rejection the guest UI should answer with the identity-verification choices. */
export class TeacherAccessVerificationRequiredError extends Error {
  constructor() {
    super("เซสชันยืนยันตัวตนหมดอายุ กรุณายืนยันตัวตนใหม่");
    this.name = "TeacherAccessVerificationRequiredError";
  }
}

/**
 * A guest-link failure with the HTTP status preserved but the Axios error (and
 * the link token inside its request config) dropped. Callers need the status to
 * tell a retryable outage apart from a permanent rejection.
 */
export class TeacherAccessRequestError extends Error {
  readonly status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "TeacherAccessRequestError";
    this.status = status;
  }
}

function guestHeaders(
  credential: TeacherLinkCredential,
): Record<string, string> {
  return credential.sessionToken
    ? {
        [TOKEN_HEADER]: credential.token,
        [SESSION_HEADER]: credential.sessionToken,
      }
    : { [TOKEN_HEADER]: credential.token };
}

function responseStatus(error: unknown): number | undefined {
  return typeof error === "object" && error !== null
    ? (error as { response?: { status?: number } }).response?.status
    : undefined;
}

function isUnauthorized(error: unknown): boolean {
  return responseStatus(error) === 401;
}

async function runGuestRequest<T>(request: () => Promise<T>): Promise<T> {
  try {
    return await request();
  } catch (error) {
    const otpRequired = isUnauthorized(error);
    // Deliberately dropped, not forwarded as `cause`: an Axios error keeps the
    // request config, and that config holds the link token. Only the "needs
    // OTP" signal survives, as its own error type.
    throw otpRequired
      ? new TeacherAccessVerificationRequiredError()
      : new TeacherAccessRequestError(
          getApiErrorMessage(error, "ไม่สามารถดำเนินการผ่านลิงก์ครูได้"),
          responseStatus(error),
        );
  }
}

async function listGrants(input: {
  schoolId: number;
  schoolTermId?: number;
  status?: TeacherAccessGrantStatus;
  page?: number;
  limit?: number;
}): Promise<PaginatedEnvelope<TeacherAccessGrant>> {
  const response = await apiClient.get<PaginatedEnvelope<TeacherAccessGrant>>(
    "/teacher-access-grants",
    { params: input },
  );
  return response.data;
}

async function listTeacherRoster(input: {
  schoolId: number;
  schoolTermId: number;
  search?: string;
  lineStatus?: TeacherLineFilter;
  sortBy?: "name" | "linkStatus";
  sortOrder?: "asc" | "desc";
  page?: number;
  limit?: number;
}): Promise<PaginatedEnvelope<TeacherLinkRosterEntry>> {
  const response = await apiClient.get<
    PaginatedEnvelope<TeacherLinkRosterEntry>
  >("/teacher-access-grants/teacher-roster", { params: input });
  return response.data;
}

async function listAssignmentOptions(input: {
  schoolId: number;
  schoolTermId: number;
  teacherMembershipId: number;
}): Promise<TeacherAccessAssignment[]> {
  const response = await apiClient.get<DataEnvelope<TeacherAccessAssignment[]>>(
    "/teacher-access-grants/assignment-options",
    { params: input },
  );
  return response.data.data ?? [];
}

async function issueTeacherLineGroupInvitation(input: {
  schoolId: number;
  startsAt: string;
  expiresAt: string;
}): Promise<TeacherLineGroupInvitationIssueResult> {
  const response = await apiClient.post<
    DataEnvelope<TeacherLineGroupInvitationIssueResult>
  >("/teacher-access-grants/line-group-invitation", input);
  return response.data.data;
}

async function getTeacherLineGroupInvitation(
  schoolId: number,
): Promise<TeacherLineGroupInvitationSummary | null> {
  const response = await apiClient.get<
    DataEnvelope<TeacherLineGroupInvitationSummary | null>
  >("/teacher-access-grants/line-group-invitation", { params: { schoolId } });
  return response.data.data;
}

async function updateTeacherLineGroupInvitation(input: {
  invitationId: string;
  schoolId: number;
  startsAt: string;
  expiresAt: string;
}): Promise<TeacherLineGroupInvitationIssueResult> {
  const response = await apiClient.patch<
    DataEnvelope<TeacherLineGroupInvitationIssueResult>
  >(`/teacher-access-grants/line-group-invitation/${input.invitationId}`, {
    startsAt: input.startsAt,
    expiresAt: input.expiresAt,
    schoolId: input.schoolId,
  });
  return response.data.data;
}

async function revokeTeacherLineGroupInvitation(input: {
  invitationId: string;
  schoolId: number;
}): Promise<void> {
  await apiClient.post(
    `/teacher-access-grants/line-group-invitation/${input.invitationId}/revoke`,
    undefined,
    { params: { schoolId: input.schoolId } },
  );
}

async function issueGrant(
  input: IssueTeacherAccessGrantInput,
): Promise<TeacherAccessGrant> {
  const response = await apiClient.post<DataEnvelope<TeacherAccessGrant>>(
    "/teacher-access-grants",
    input,
  );
  return response.data.data;
}

async function getAttendanceDelegationOptions(input: {
  schoolId: number;
  schoolTermId: number;
  classroomId: number;
  attendanceDate: string;
}): Promise<TeacherAttendanceDelegationOptions> {
  const response = await apiClient.get<
    DataEnvelope<TeacherAttendanceDelegationOptions>
  >("/teacher-access-grants/attendance-delegation-options", { params: input });
  return response.data.data;
}

async function issueAttendanceDelegation(
  input: IssueTeacherAttendanceDelegationInput,
): Promise<TeacherAccessGrant> {
  const response = await apiClient.post<DataEnvelope<TeacherAccessGrant>>(
    "/teacher-access-grants/attendance-delegations",
    input,
  );
  return response.data.data;
}

async function getPublicAttendanceDelegationOptions(
  credential: TeacherLinkCredential,
  input: { assignmentId: number; attendanceDate: string },
): Promise<TeacherAttendanceDelegationOptions> {
  return await runGuestRequest(async () => {
    const response = await apiClient.get<
      DataEnvelope<TeacherAttendanceDelegationOptions>
    >("/teacher-access/attendance-delegation-options", {
      headers: guestHeaders(credential),
      params: input,
    });
    return response.data.data;
  });
}

async function issuePublicAttendanceDelegation(
  credential: TeacherLinkCredential,
  input: IssuePublicTeacherAttendanceDelegationInput,
): Promise<TeacherAccessGrant> {
  return await runGuestRequest(async () => {
    const response = await apiClient.post<DataEnvelope<TeacherAccessGrant>>(
      "/teacher-access/attendance-delegations",
      input,
      { headers: guestHeaders(credential) },
    );
    return response.data.data;
  });
}

/** Handing the round to another teacher answers with the new link to share. */
async function updateAttendanceDelegation(
  input: UpdateTeacherAttendanceDelegationInput,
): Promise<{ grantId: string; accessUrl: string | null }> {
  const response = await apiClient.patch<{
    data: { grantId: string; accessUrl?: string | null };
  }>(`/teacher-access-grants/attendance-delegations/${input.grantId}`, {
    schoolId: input.schoolId,
    endsOn: input.endsOn,
    endsAt: input.endsAt,
    ...(input.teacherMembershipId
      ? { teacherMembershipId: input.teacherMembershipId }
      : {}),
  });
  return {
    grantId: response.data.data.grantId,
    accessUrl: response.data.data.accessUrl ?? null,
  };
}

async function updatePublicAttendanceDelegation(
  credential: TeacherLinkCredential,
  input: UpdatePublicTeacherAttendanceDelegationInput,
): Promise<{ grantId: string; accessUrl: string | null }> {
  return await runGuestRequest(async () => {
    const response = await apiClient.patch<{
      data: { grantId: string; accessUrl?: string | null };
    }>(
      `/teacher-access/attendance-delegations/${input.grantId}`,
      {
        assignmentId: input.assignmentId,
        endsOn: input.endsOn,
        endsAt: input.endsAt,
        ...(input.teacherMembershipId
          ? { teacherMembershipId: input.teacherMembershipId }
          : {}),
      },
      { headers: guestHeaders(credential) },
    );
    return {
      grantId: response.data.data.grantId,
      accessUrl: response.data.data.accessUrl ?? null,
    };
  });
}

async function revokePublicAttendanceDelegation(
  credential: TeacherLinkCredential,
  input: { grantId: string; assignmentId: number },
): Promise<void> {
  await runGuestRequest(async () => {
    await apiClient.post(
      `/teacher-access/attendance-delegations/${input.grantId}/revoke`,
      { assignmentId: input.assignmentId },
      { headers: guestHeaders(credential) },
    );
  });
}

async function issueGrantsForTerm(
  input: IssueTeacherAccessGrantsForTermInput,
): Promise<BulkIssueTeacherAccessResult> {
  const response = await apiClient.post<
    DataEnvelope<BulkIssueTeacherAccessResult>
  >("/teacher-access-grants/bulk", input);
  return response.data.data;
}

async function sendGrantsOverLine(
  input: SendTeacherAccessGrantsInput,
): Promise<SendTeacherAccessGrantsResult> {
  const response = await apiClient.post<
    DataEnvelope<SendTeacherAccessGrantsResult>
  >("/teacher-access-grants/send-line", input);
  return response.data.data;
}

async function unlinkTeacherLineAccount(
  teacherMembershipId: string,
): Promise<void> {
  await apiClient.post(
    `/teacher-access-grants/teacher-memberships/${teacherMembershipId}/unlink-line`,
  );
}

async function getGrantLink(grantId: string): Promise<string> {
  const response = await apiClient.get<
    DataEnvelope<{ grantId: string; accessUrl: string }>
  >(`/teacher-access-grants/${grantId}/link`);
  return response.data.data.accessUrl;
}

async function revokeGrant(
  grantId: string,
  reason: string,
): Promise<TeacherAccessGrant> {
  const response = await apiClient.post<DataEnvelope<TeacherAccessGrant>>(
    `/teacher-access-grants/${grantId}/revoke`,
    { reason },
  );
  return response.data.data;
}

async function revokeAttendanceDelegation(grantId: string): Promise<void> {
  await apiClient.post(
    `/teacher-access-grants/attendance-delegations/${grantId}/revoke`,
  );
}

async function rotateGrant(grantId: string): Promise<TeacherAccessGrant> {
  const response = await apiClient.post<DataEnvelope<TeacherAccessGrant>>(
    `/teacher-access-grants/${grantId}/rotate`,
  );
  return response.data.data;
}

async function requestOtp(token: string): Promise<TeacherAccessOtpChallenge> {
  return runGuestRequest(async () => {
    const response = await apiClient.post<
      DataEnvelope<TeacherAccessOtpChallenge>
    >("/teacher-access/otp/request", undefined, {
      headers: { [TOKEN_HEADER]: token },
    });
    return response.data.data;
  });
}

async function verifyOtp(token: string, otp: string): Promise<string> {
  try {
    const response = await apiClient.post<
      DataEnvelope<{ sessionToken: string }>
    >(
      "/teacher-access/otp/verify",
      { otp },
      { headers: { [TOKEN_HEADER]: token } },
    );
    return response.data.data.sessionToken;
  } catch (error) {
    const message = getApiErrorMessage(error, "ยืนยันรหัส OTP ไม่สำเร็จ");
    // Keeps the backend's reason (wrong / expired / locked) but drops the Axios
    // error object, whose request config still holds the link token.
    // eslint-disable-next-line preserve-caught-error
    throw new Error(message);
  }
}

async function createAraIdChallenge(
  token: string,
): Promise<TeacherAccessAraIdChallenge> {
  try {
    const response = await apiClient.post<
      DataEnvelope<TeacherAccessAraIdChallenge>
    >("/teacher-access/araid/challenge", undefined, {
      headers: { [TOKEN_HEADER]: token },
    });
    return response.data.data;
  } catch (error) {
    // Drop Axios config because it contains the raw teacher-link credential.
    // eslint-disable-next-line preserve-caught-error
    throw new Error(
      getApiErrorMessage(error, "สร้างคำขอยืนยัน AraID ไม่สำเร็จ"),
    );
  }
}

async function pollAraIdChallenge(
  challengeToken: string,
): Promise<TeacherAccessAraIdChallengeStatus> {
  try {
    const response = await apiClient.post<
      DataEnvelope<TeacherAccessAraIdChallengeStatus>
    >("/teacher-access/araid/challenge/status", undefined, {
      headers: { [ARAID_CHALLENGE_HEADER]: challengeToken },
    });
    return response.data.data;
  } catch (error) {
    // eslint-disable-next-line preserve-caught-error
    throw new Error(getApiErrorMessage(error, "คำขอยืนยัน AraID หมดอายุแล้ว"));
  }
}

async function beginAraIdChallenge(
  challengeToken: string,
): Promise<{ expiresAt: string }> {
  try {
    const response = await apiClient.post<DataEnvelope<{ expiresAt: string }>>(
      "/teacher-access/araid/challenge/begin",
      undefined,
      { headers: { [ARAID_CHALLENGE_HEADER]: challengeToken } },
    );
    return response.data.data;
  } catch (error) {
    // eslint-disable-next-line preserve-caught-error
    throw new Error(
      getApiErrorMessage(error, "คำขอยืนยัน AraID ถูกใช้หรือหมดอายุแล้ว"),
    );
  }
}

async function approveAraIdChallenge(): Promise<void> {
  try {
    await apiClient.post("/teacher-access/araid/challenge/approve");
  } catch (error) {
    // eslint-disable-next-line preserve-caught-error
    throw new Error(getApiErrorMessage(error, "ยืนยันคำขอ AraID ไม่สำเร็จ"));
  }
}

async function getContext(
  credential: TeacherLinkCredential,
): Promise<TeacherAccessContext> {
  return runGuestRequest(async () => {
    const response = await apiClient.get<DataEnvelope<TeacherAccessContext>>(
      "/teacher-access/context",
      { headers: guestHeaders(credential) },
    );
    return response.data.data;
  });
}

async function listAttendanceSlots(
  credential: TeacherLinkCredential,
  input: { assignmentId: number; date: string },
): Promise<TeacherAccessAttendanceSlot[]> {
  return runGuestRequest(async () => {
    const response = await apiClient.get<
      DataEnvelope<TeacherAccessAttendanceSlot[]>
    >("/teacher-access/attendance-slots", {
      headers: guestHeaders(credential),
      params: input,
    });
    return response.data.data;
  });
}

async function getRosterPage(
  credential: TeacherLinkCredential,
  assignmentId: number,
  page: number,
): Promise<PaginatedEnvelope<TeacherAccessRosterStudent>> {
  return runGuestRequest(async () => {
    const response = await apiClient.get<
      PaginatedEnvelope<TeacherAccessRosterStudent>
    >("/teacher-access/roster", {
      headers: guestHeaders(credential),
      params: { assignmentId, page, limit: 50 },
    });
    return response.data;
  });
}

async function getCompleteRoster(
  credential: TeacherLinkCredential,
  assignmentId: number,
): Promise<TeacherAccessRosterStudent[]> {
  const first = await getRosterPage(credential, assignmentId, 1);
  if (first.meta.totalPages <= 1) return first.data;
  const remaining = await Promise.all(
    Array.from({ length: first.meta.totalPages - 1 }, (_, index) =>
      getRosterPage(credential, assignmentId, index + 2),
    ),
  );
  return [first.data, ...remaining.map((page) => page.data)].flat();
}

export interface TeacherAttendanceHistoryQuery {
  assignmentId: number;
  /** Rounds per day (default) or one row per student. */
  view?: "DAILY" | "STUDENT";
  /** Set to drill into a single student's days. */
  studentUuid?: string;
  search?: string;
  attendanceDate?: string;
  dateFrom?: string;
  dateTo?: string;
  sortBy?:
    | "date"
    | "time"
    | "recordedBy"
    | "studentNumber"
    | "name"
    | "status"
    | "present"
    | "late"
    | "leave"
    | "absent";
  sortOrder?: "asc" | "desc";
}

async function listAttendanceImports(
  credential: TeacherLinkCredential,
  input: {
    assignmentId: number;
    page: number;
    limit: number;
    attendanceDate?: string;
    search?: string;
  },
): Promise<PaginatedEnvelope<AttendanceImportHistoryEntry>> {
  return runGuestRequest(async () => {
    const response = await apiClient.get<
      PaginatedEnvelope<AttendanceImportHistoryEntry>
    >("/teacher-access/attendance-imports", {
      headers: guestHeaders(credential),
      params: input,
    });
    return response.data;
  });
}

async function recordAttendanceImport(
  credential: TeacherLinkCredential,
  input: {
    assignmentId: number;
    attendanceDate: string;
    timetableSlotId?: number;
    fileName: string;
    sourceUrl?: string;
    rowCount: number;
    appliedCount: number;
    file?: File;
  },
): Promise<void> {
  const form = new FormData();
  if (input.file) form.append("file", input.file, input.fileName);
  form.append("assignmentId", String(input.assignmentId));
  form.append("attendanceDate", input.attendanceDate);
  if (input.timetableSlotId) {
    form.append("timetableSlotId", String(input.timetableSlotId));
  }
  form.append("fileName", input.fileName);
  if (input.sourceUrl) form.append("sourceUrl", input.sourceUrl);
  form.append("rowCount", String(input.rowCount));
  form.append("appliedCount", String(input.appliedCount));
  await runGuestRequest(async () => {
    await apiClient.post("/teacher-access/attendance-imports", form, {
      headers: guestHeaders(credential),
    });
  });
}

async function listAttendanceDelegationHistory(
  credential: TeacherLinkCredential,
  input: {
    assignmentId: number;
    page: number;
    limit: number;
    attendanceDate?: string;
    search?: string;
    sortBy?: "date" | "issuedBy" | "teacher" | "status";
    sortDirection?: "asc" | "desc";
  },
): Promise<PaginatedEnvelope<TeacherAttendanceDelegationHistoryEntry>> {
  return runGuestRequest(async () => {
    const response = await apiClient.get<
      PaginatedEnvelope<TeacherAttendanceDelegationHistoryEntry>
    >("/teacher-access/attendance-delegation-history", {
      headers: guestHeaders(credential),
      params: input,
    });
    return response.data;
  });
}

async function listStaffAttendanceDelegationHistory(input: {
  schoolId: number;
  classroomId: number;
  subjectId?: number;
  page: number;
  limit: number;
  attendanceDate?: string;
  search?: string;
  sortBy?: "date" | "issuedBy" | "teacher" | "status";
  sortDirection?: "asc" | "desc";
}): Promise<PaginatedEnvelope<TeacherAttendanceDelegationHistoryEntry>> {
  const response = await apiClient.get<
    PaginatedEnvelope<TeacherAttendanceDelegationHistoryEntry>
  >("/teacher-access-grants/attendance-delegation-history", { params: input });
  return response.data;
}

async function listAttendanceHistoryStudents(
  credential: TeacherLinkCredential,
  input: TeacherAttendanceHistoryQuery & { page: number; limit: number },
): Promise<PaginatedEnvelope<TeacherAttendanceHistoryStudent>> {
  return runGuestRequest(async () => {
    const response = await apiClient.get<
      PaginatedEnvelope<TeacherAttendanceHistoryStudent>
    >("/teacher-access/attendance-history", {
      headers: guestHeaders(credential),
      params: { ...input, view: "STUDENT" },
    });
    return response.data;
  });
}

async function listAttendanceHistoryStudentDays(
  credential: TeacherLinkCredential,
  input: TeacherAttendanceHistoryQuery & {
    studentUuid: string;
    page: number;
    limit: number;
  },
): Promise<PaginatedEnvelope<TeacherAttendanceHistoryStudentDay>> {
  return runGuestRequest(async () => {
    const response = await apiClient.get<
      PaginatedEnvelope<TeacherAttendanceHistoryStudentDay>
    >("/teacher-access/attendance-history", {
      headers: guestHeaders(credential),
      params: input,
    });
    return response.data;
  });
}

async function listAttendanceHistory(
  credential: TeacherLinkCredential,
  input: TeacherAttendanceHistoryQuery & { page: number; limit: number },
): Promise<PaginatedEnvelope<TeacherAttendanceHistoryEntry>> {
  return runGuestRequest(async () => {
    const response = await apiClient.get<
      PaginatedEnvelope<TeacherAttendanceHistoryEntry>
    >("/teacher-access/attendance-history", {
      headers: guestHeaders(credential),
      params: input,
    });
    return response.data;
  });
}

async function listCompleteAttendanceHistory(
  credential: TeacherLinkCredential,
  input: Omit<Parameters<typeof listAttendanceHistory>[1], "page" | "limit">,
): Promise<TeacherAttendanceHistoryEntry[]> {
  const first = await listAttendanceHistory(credential, {
    ...input,
    page: 1,
    limit: 100,
  });
  if (first.meta.totalPages <= 1) return first.data;
  const remaining = await Promise.all(
    Array.from({ length: first.meta.totalPages - 1 }, (_, index) =>
      listAttendanceHistory(credential, {
        ...input,
        page: index + 2,
        limit: 100,
      }),
    ),
  );
  return [first.data, ...remaining.map((page) => page.data)].flat();
}

async function createStudentComment(
  credential: TeacherLinkCredential,
  input: {
    assignmentId: number;
    studentUuid: string;
    problemCategory: ClassroomStudentProblemCategory;
    problemDescription: string;
  },
): Promise<void> {
  await runGuestRequest(async () => {
    await apiClient.post("/teacher-access/student-comments", input, {
      headers: guestHeaders(credential),
    });
  });
}

async function getStudentProfile(
  credential: TeacherLinkCredential,
  input: { assignmentId: number; studentUuid: string },
): Promise<TeacherStudentProfile> {
  return runGuestRequest(async () => {
    const response = await apiClient.get<DataEnvelope<TeacherStudentProfile>>(
      "/teacher-access/student-profile",
      { headers: guestHeaders(credential), params: input },
    );
    return response.data.data;
  });
}

async function getMySchedule(
  credential: TeacherLinkCredential,
): Promise<TeacherScheduleResponse> {
  return runGuestRequest(async () => {
    const response = await apiClient.get<DataEnvelope<TeacherScheduleResponse>>(
      "/teacher-access/my-schedule",
      { headers: guestHeaders(credential) },
    );
    return response.data.data;
  });
}

async function getStudentSubjectAttendance(
  credential: TeacherLinkCredential,
  input: { assignmentId: number; studentUuid: string; date: string },
): Promise<unknown> {
  return runGuestRequest(async () => {
    const response = await apiClient.get<{ data?: unknown }>(
      "/teacher-access/student-subject-attendance",
      { headers: guestHeaders(credential), params: input },
    );
    return response.data?.data ?? response.data;
  });
}

async function updateClassroomCard(
  credential: TeacherLinkCredential,
  input: {
    assignmentId: number;
    cardCoverColor?: string;
    coverImagePositionX?: number;
    coverImagePositionY?: number;
    coverImageScale?: number;
    file?: File;
    removeCover?: boolean;
  },
): Promise<void> {
  const formData = new FormData();
  formData.append("assignmentId", String(input.assignmentId));
  if (input.cardCoverColor)
    formData.append("cardCoverColor", input.cardCoverColor);
  if (input.coverImagePositionX !== undefined) {
    formData.append(
      "coverImagePositionX",
      String(Math.round(input.coverImagePositionX)),
    );
  }
  if (input.coverImagePositionY !== undefined) {
    formData.append(
      "coverImagePositionY",
      String(Math.round(input.coverImagePositionY)),
    );
  }
  if (input.coverImageScale !== undefined) {
    formData.append("coverImageScale", String(input.coverImageScale));
  }
  if (input.file) formData.append("photo", input.file);
  if (input.removeCover) formData.append("removeCover", "true");
  await runGuestRequest(async () => {
    await apiClient.patch("/teacher-access/classroom-cover", formData, {
      headers: guestHeaders(credential),
    });
  });
}

/**
 * The cover endpoint authenticates by header, which an `<img src>` cannot send —
 * so the image is fetched as a blob and handed to the card as an object URL.
 */
async function getClassroomCoverBlob(
  credential: TeacherLinkCredential,
  assignmentId: number,
): Promise<Blob> {
  return runGuestRequest(async () => {
    const response = await apiClient.get<Blob>(
      "/teacher-access/classroom-cover",
      {
        headers: guestHeaders(credential),
        params: { assignmentId },
        responseType: "blob",
      },
    );
    return response.data;
  });
}

async function getStudentPhotoBlob(
  credential: TeacherLinkCredential,
  input: { assignmentId: number; studentUuid: string },
): Promise<Blob> {
  return runGuestRequest(async () => {
    const response = await apiClient.get<Blob>(
      "/teacher-access/student-photo",
      {
        headers: guestHeaders(credential),
        params: input,
        responseType: "blob",
      },
    );
    return response.data;
  });
}

async function recordClassroomExport(
  credential: TeacherLinkCredential,
  input: {
    assignmentId: number;
    exportScope: "ROSTER" | "ATTENDANCE";
    format: string;
    columns: string[];
    dateFrom?: string;
    dateTo?: string;
  },
): Promise<void> {
  await runGuestRequest(async () => {
    await apiClient.post("/teacher-access/export-events", input, {
      headers: guestHeaders(credential),
    });
  });
}

interface TeacherAccessAttendanceInput {
  assignmentId: number;
  timetableSlotId: number;
  date: string;
  records: Array<{
    studentId: string;
    status: Exclude<AttendanceSelectionStatus, "NONE">;
    markedAt?: string | null;
  }>;
  /** Students whose mark was taken back; their stored row is deleted. */
  clearedStudentIds?: string[];
}

async function saveAttendance(
  credential: TeacherLinkCredential,
  input: TeacherAccessAttendanceInput,
): Promise<void> {
  await runGuestRequest(async () => {
    await apiClient.post("/teacher-access/attendance", input, {
      headers: guestHeaders(credential),
    });
  });
}

/** Autosave for a check-in in progress; may carry only part of the class. */
async function saveAttendanceMarks(
  credential: TeacherLinkCredential,
  input: TeacherAccessAttendanceInput,
): Promise<void> {
  await runGuestRequest(async () => {
    await apiClient.post("/teacher-access/attendance-marks", input, {
      headers: guestHeaders(credential),
    });
  });
}

async function getAttendanceSession(
  credential: TeacherLinkCredential,
  query: { assignmentId: number; date: string; timetableSlotId?: number },
): Promise<TeacherAccessAttendanceSession> {
  return await runGuestRequest(async () => {
    const response = await apiClient.get<{
      data: TeacherAccessAttendanceSession;
    }>("/teacher-access/attendance-session", {
      headers: guestHeaders(credential),
      params: query,
    });
    return response.data.data;
  });
}

async function getAttendanceCalendar(
  credential: TeacherLinkCredential,
  query: { assignmentId: number; date: string },
): Promise<TeacherAccessAttendanceCalendar> {
  return await runGuestRequest(async () => {
    const response = await apiClient.get<{
      data: TeacherAccessAttendanceCalendar;
    }>("/teacher-access/attendance-session", {
      headers: guestHeaders(credential),
      params: { ...query, preflightOnly: true },
    });
    return response.data.data;
  });
}

/**
 * Guest-link counterpart of the authenticated import parse. The grant is
 * authorized server-side, so a delegated attendance-only link reaches the same
 * reader without gaining any other access.
 */
async function parseAttendanceImport(
  credential: TeacherLinkCredential,
  input: { assignmentId: number; file?: File; url?: string },
): Promise<AttendanceImportSheet> {
  return await runGuestRequest(async () => {
    const formData = new FormData();
    formData.append("assignmentId", String(input.assignmentId));
    if (input.file) formData.append("file", input.file);
    if (input.url) formData.append("url", input.url);
    const response = await apiClient.post<DataEnvelope<AttendanceImportSheet>>(
      "/teacher-access/attendance-import/parse",
      formData,
      { headers: guestHeaders(credential) },
    );
    return response.data.data;
  });
}

export const teacherAccessService = {
  parseAttendanceImport,
  listGrants,
  listTeacherRoster,
  listAssignmentOptions,
  issueGrant,
  getAttendanceDelegationOptions,
  issueAttendanceDelegation,
  getPublicAttendanceDelegationOptions,
  issuePublicAttendanceDelegation,
  updateAttendanceDelegation,
  updatePublicAttendanceDelegation,
  revokePublicAttendanceDelegation,
  issueGrantsForTerm,
  sendGrantsOverLine,
  unlinkTeacherLineAccount,
  issueTeacherLineGroupInvitation,
  getTeacherLineGroupInvitation,
  updateTeacherLineGroupInvitation,
  revokeTeacherLineGroupInvitation,
  getGrantLink,
  revokeAttendanceDelegation,
  revokeGrant,
  rotateGrant,
  requestOtp,
  verifyOtp,
  createAraIdChallenge,
  beginAraIdChallenge,
  pollAraIdChallenge,
  approveAraIdChallenge,
  getContext,
  listAttendanceSlots,
  getCompleteRoster,
  listAttendanceHistory,
  listAttendanceDelegationHistory,
  listAttendanceImports,
  listAttendanceHistoryStudentDays,
  listAttendanceHistoryStudents,
  listCompleteAttendanceHistory,
  listStaffAttendanceDelegationHistory,
  recordAttendanceImport,
  createStudentComment,
  getClassroomCoverBlob,
  getStudentPhotoBlob,
  getMySchedule,
  getStudentProfile,
  getStudentSubjectAttendance,
  recordClassroomExport,
  updateClassroomCard,
  saveAttendance,
  saveAttendanceMarks,
  getAttendanceSession,
  getAttendanceCalendar,
};
