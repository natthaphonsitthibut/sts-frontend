import { apiClient } from "../../../lib/api-client";
import type {
  IssueTeacherAccessGrantInput,
  PaginationMeta,
  TeacherAccessAssignment,
  TeacherAccessContext,
  TeacherAccessGrant,
  TeacherAccessGrantStatus,
  TeacherAccessRosterStudent,
} from "../types/teacher-access.types";

interface DataEnvelope<T> {
  data: T;
}

interface PaginatedEnvelope<T> extends DataEnvelope<T[]> {
  meta: PaginationMeta;
}

const TOKEN_HEADER = "x-teacher-access-token";

async function runGuestRequest<T>(request: () => Promise<T>): Promise<T> {
  try {
    return await request();
  } catch {
    // Do not retain an Axios error whose request config contains the guest token.
    throw new Error("Teacher access request failed");
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

async function getContext(token: string): Promise<TeacherAccessContext> {
  return runGuestRequest(async () => {
    const response = await apiClient.get<DataEnvelope<TeacherAccessContext>>(
      "/teacher-access/context",
      { headers: { [TOKEN_HEADER]: token } },
    );
    return response.data.data;
  });
}

async function getRosterPage(
  token: string,
  assignmentId: number,
  page: number,
): Promise<PaginatedEnvelope<TeacherAccessRosterStudent>> {
  return runGuestRequest(async () => {
    const response = await apiClient.get<PaginatedEnvelope<TeacherAccessRosterStudent>>(
      "/teacher-access/roster",
      {
        headers: { [TOKEN_HEADER]: token },
        params: { assignmentId, page, limit: 50 },
      },
    );
    return response.data;
  });
}

async function getCompleteRoster(
  token: string,
  assignmentId: number,
): Promise<TeacherAccessRosterStudent[]> {
  const first = await getRosterPage(token, assignmentId, 1);
  if (first.meta.totalPages <= 1) return first.data;
  const remaining = await Promise.all(
    Array.from({ length: first.meta.totalPages - 1 }, (_, index) =>
      getRosterPage(token, assignmentId, index + 2),
    ),
  );
  return [first.data, ...remaining.map((page) => page.data)].flat();
}

async function saveAttendance(
  token: string,
  input: {
    assignmentId: number;
    date: string;
    records: Array<{ studentId: string; status: "P_PRESENT" | "P_ABSENT" | "P_LATE" }>;
  },
): Promise<void> {
  await runGuestRequest(async () => {
    await apiClient.post("/teacher-access/attendance", input, {
      headers: { [TOKEN_HEADER]: token },
    });
  });
}

export const teacherAccessService = {
  listGrants,
  listAssignmentOptions,
  issueGrant,
  revokeGrant,
  rotateGrant,
  getContext,
  getCompleteRoster,
  saveAttendance,
};
