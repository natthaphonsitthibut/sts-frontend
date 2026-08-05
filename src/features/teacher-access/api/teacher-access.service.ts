import { apiClient } from "../../../lib/api-client";
import { getApiErrorMessage } from "../../../lib/api-error";
import type { AttendanceSelectionStatus } from "../../attendance/types/attendance.types";
import type { TeacherLinkCredential } from "../store/teacher-link-session.store";
import type {
  BulkIssueTeacherAccessResult,
  IssueTeacherAccessGrantsForTermInput,
  SendTeacherAccessGrantsInput,
  SendTeacherAccessGrantsResult,
  IssueTeacherAccessGrantInput,
  PaginationMeta,
  TeacherAccessAssignment,
  TeacherAccessContext,
  TeacherAccessGrant,
  TeacherAccessGrantStatus,
  TeacherAccessOtpChallenge,
  TeacherAccessRosterStudent,
  TeacherAttendanceHistoryEntry,
  TeacherLineFilter,
  TeacherLinkRosterEntry,
  TeacherScheduleResponse,
  TeacherStudentProfile,
} from "../types/teacher-access.types";

interface DataEnvelope<T> {
  data: T;
}

interface PaginatedEnvelope<T> extends DataEnvelope<T[]> {
  meta: PaginationMeta;
}

const TOKEN_HEADER = "x-teacher-access-token";
const SESSION_HEADER = "x-teacher-access-session";

/** Marks a rejection the guest UI should answer with the OTP form. */
export class TeacherAccessOtpRequiredError extends Error {
  constructor() {
    super("OTP_REQUIRED");
    this.name = "TeacherAccessOtpRequiredError";
  }
}

function guestHeaders(credential: TeacherLinkCredential): Record<string, string> {
  return credential.sessionToken
    ? { [TOKEN_HEADER]: credential.token, [SESSION_HEADER]: credential.sessionToken }
    : { [TOKEN_HEADER]: credential.token };
}

function isUnauthorized(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { response?: { status?: number } }).response?.status === 401
  );
}

async function runGuestRequest<T>(request: () => Promise<T>): Promise<T> {
  try {
    return await request();
  } catch (error) {
    const otpRequired = isUnauthorized(error);
    // Deliberately dropped, not forwarded as `cause`: an Axios error keeps the
    // request config, and that config holds the link token. Only the "needs
    // OTP" signal survives, as its own error type.
    throw otpRequired ? new TeacherAccessOtpRequiredError() : new Error("Teacher access request failed");
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
  const response = await apiClient.get<PaginatedEnvelope<TeacherLinkRosterEntry>>(
    "/teacher-access-grants/teacher-roster",
    { params: input },
  );
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

async function issueGrant(input: IssueTeacherAccessGrantInput): Promise<TeacherAccessGrant> {
  const response = await apiClient.post<DataEnvelope<TeacherAccessGrant>>(
    "/teacher-access-grants",
    input,
  );
  return response.data.data;
}

async function issueGrantsForTerm(
  input: IssueTeacherAccessGrantsForTermInput,
): Promise<BulkIssueTeacherAccessResult> {
  const response = await apiClient.post<DataEnvelope<BulkIssueTeacherAccessResult>>(
    "/teacher-access-grants/bulk",
    input,
  );
  return response.data.data;
}

async function sendGrantsOverLine(
  input: SendTeacherAccessGrantsInput,
): Promise<SendTeacherAccessGrantsResult> {
  const response = await apiClient.post<DataEnvelope<SendTeacherAccessGrantsResult>>(
    "/teacher-access-grants/send-line",
    input,
  );
  return response.data.data;
}

async function getGrantLink(grantId: string): Promise<string> {
  const response = await apiClient.get<DataEnvelope<{ grantId: string; accessUrl: string }>>(
    `/teacher-access-grants/${grantId}/link`,
  );
  return response.data.data.accessUrl;
}

async function revokeGrant(grantId: string, reason: string): Promise<TeacherAccessGrant> {
  const response = await apiClient.post<DataEnvelope<TeacherAccessGrant>>(
    `/teacher-access-grants/${grantId}/revoke`,
    { reason },
  );
  return response.data.data;
}

async function rotateGrant(grantId: string): Promise<TeacherAccessGrant> {
  const response = await apiClient.post<DataEnvelope<TeacherAccessGrant>>(
    `/teacher-access-grants/${grantId}/rotate`,
  );
  return response.data.data;
}

async function requestOtp(token: string): Promise<TeacherAccessOtpChallenge> {
  return runGuestRequest(async () => {
    const response = await apiClient.post<DataEnvelope<TeacherAccessOtpChallenge>>(
      "/teacher-access/otp/request",
      undefined,
      { headers: { [TOKEN_HEADER]: token } },
    );
    return response.data.data;
  });
}

async function verifyOtp(token: string, otp: string): Promise<string> {
  try {
    const response = await apiClient.post<DataEnvelope<{ sessionToken: string }>>(
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

async function getContext(credential: TeacherLinkCredential): Promise<TeacherAccessContext> {
  return runGuestRequest(async () => {
    const response = await apiClient.get<DataEnvelope<TeacherAccessContext>>(
      "/teacher-access/context",
      { headers: guestHeaders(credential) },
    );
    return response.data.data;
  });
}

async function getRosterPage(
  credential: TeacherLinkCredential,
  assignmentId: number,
  page: number,
): Promise<PaginatedEnvelope<TeacherAccessRosterStudent>> {
  return runGuestRequest(async () => {
    const response = await apiClient.get<PaginatedEnvelope<TeacherAccessRosterStudent>>(
      "/teacher-access/roster",
      {
        headers: guestHeaders(credential),
        params: { assignmentId, page, limit: 50 },
      },
    );
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

async function listAttendanceHistory(
  credential: TeacherLinkCredential,
  input: {
    assignmentId: number;
    page: number;
    limit: number;
    search?: string;
    attendanceDate?: string;
    sortBy?: "date" | "recordedBy" | "present" | "late" | "leave" | "absent";
    sortOrder?: "asc" | "desc";
  },
): Promise<PaginatedEnvelope<TeacherAttendanceHistoryEntry>> {
  return runGuestRequest(async () => {
    const response = await apiClient.get<PaginatedEnvelope<TeacherAttendanceHistoryEntry>>(
      "/teacher-access/attendance-history",
      { headers: guestHeaders(credential), params: input },
    );
    return response.data;
  });
}

async function listCompleteAttendanceHistory(
  credential: TeacherLinkCredential,
  input: Omit<Parameters<typeof listAttendanceHistory>[1], "page" | "limit">,
): Promise<TeacherAttendanceHistoryEntry[]> {
  const first = await listAttendanceHistory(credential, { ...input, page: 1, limit: 100 });
  if (first.meta.totalPages <= 1) return first.data;
  const remaining = await Promise.all(
    Array.from({ length: first.meta.totalPages - 1 }, (_, index) =>
      listAttendanceHistory(credential, { ...input, page: index + 2, limit: 100 }),
    ),
  );
  return [first.data, ...remaining.map((page) => page.data)].flat();
}

async function createStudentComment(
  credential: TeacherLinkCredential,
  input: { assignmentId: number; studentUuid: string; commentText: string },
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
  if (input.cardCoverColor) formData.append("cardCoverColor", input.cardCoverColor);
  if (input.coverImagePositionX !== undefined) {
    formData.append("coverImagePositionX", String(Math.round(input.coverImagePositionX)));
  }
  if (input.coverImagePositionY !== undefined) {
    formData.append("coverImagePositionY", String(Math.round(input.coverImagePositionY)));
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
    const response = await apiClient.get<Blob>("/teacher-access/classroom-cover", {
      headers: guestHeaders(credential),
      params: { assignmentId },
      responseType: "blob",
    });
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

async function saveAttendance(
  credential: TeacherLinkCredential,
  input: {
    assignmentId: number;
    timetableSlotId?: number;
    date: string;
    records: Array<{
      studentId: string;
      status: Exclude<AttendanceSelectionStatus, "NONE">;
    }>;
  },
): Promise<void> {
  await runGuestRequest(async () => {
    await apiClient.post("/teacher-access/attendance", input, {
      headers: guestHeaders(credential),
    });
  });
}

export const teacherAccessService = {
  listGrants,
  listTeacherRoster,
  listAssignmentOptions,
  issueGrant,
  issueGrantsForTerm,
  sendGrantsOverLine,
  getGrantLink,
  revokeGrant,
  rotateGrant,
  requestOtp,
  verifyOtp,
  getContext,
  getCompleteRoster,
  listAttendanceHistory,
  listCompleteAttendanceHistory,
  createStudentComment,
  getClassroomCoverBlob,
  getMySchedule,
  getStudentProfile,
  getStudentSubjectAttendance,
  recordClassroomExport,
  updateClassroomCard,
  saveAttendance,
};
