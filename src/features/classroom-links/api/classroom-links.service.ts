import { apiClient } from "../../../lib/api-client";
import type {
  AttendanceAssignmentPayload,
  BulkCreateClassroomLinksResult,
  ClassroomLinkActionResult,
  ClassroomLinkListItem,
  ClassroomLinkDelivery,
  ClassroomLinkListParams,
  ClassroomLinkListResponse,
  ClassroomLineGroupInvitation,
  ClassroomLineGroupInvitationInput,
  ClassroomLinkUsage,
  IssuedClassroomLink,
  IssuedClassroomLinkParams,
} from "../types/classroom-links.types";

interface DataEnvelope<T> {
  success: true;
  data: T;
}

async function list(
  params: ClassroomLinkListParams,
): Promise<ClassroomLinkListResponse> {
  const response = await apiClient.get<ClassroomLinkListResponse>(
    "/classroom-attendance-links",
    { params },
  );
  return response.data;
}

/** The register of links this school has issued this term — both kinds. */
async function listIssued(params: IssuedClassroomLinkParams): Promise<{
  data: IssuedClassroomLink[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}> {
  const response = await apiClient.get<{
    data: IssuedClassroomLink[];
    meta: { page: number; limit: number; total: number; totalPages: number };
  }>("/classroom-attendance-links/issued", { params });
  return response.data;
}

/** Who opened one link, and every register taken through it. */
async function getUsage(linkId: string): Promise<ClassroomLinkUsage> {
  const response = await apiClient.get<{ data: ClassroomLinkUsage }>(
    `/classroom-attendance-links/${encodeURIComponent(linkId)}/usage`,
  );
  return response.data.data;
}

async function createAssignment(
  input: AttendanceAssignmentPayload,
): Promise<{ data: ClassroomLinkListItem & { accessUrl: string } }> {
  const response = await apiClient.post<{
    data: ClassroomLinkListItem & { accessUrl: string };
  }>("/classroom-attendance-links/assignments", input);
  return response.data;
}

async function bulkCreate(input: {
  schoolId: number;
  schoolTermId: number;
  teacherMembershipIds?: number[];
  allTeachers?: boolean;
}): Promise<BulkCreateClassroomLinksResult> {
  const response = await apiClient.post<BulkCreateClassroomLinksResult>(
    "/classroom-attendance-links/bulk",
    input,
  );
  return response.data;
}

async function redisplay(id: string): Promise<ClassroomLinkActionResult> {
  const response = await apiClient.get<DataEnvelope<ClassroomLinkActionResult>>(
    `/classroom-attendance-links/${encodeURIComponent(id)}/link`,
  );
  return response.data.data;
}

async function rotate(id: string): Promise<ClassroomLinkActionResult> {
  const response = await apiClient.post<
    DataEnvelope<ClassroomLinkActionResult>
  >(`/classroom-attendance-links/${encodeURIComponent(id)}/rotate`);
  return response.data.data;
}

async function deactivate(id: string): Promise<void> {
  await apiClient.post(
    `/classroom-attendance-links/${encodeURIComponent(id)}/deactivate`,
  );
}

async function resendLine(id: string): Promise<ClassroomLinkDelivery> {
  const response = await apiClient.post<
    DataEnvelope<{ id: string; lineDelivery: ClassroomLinkDelivery }>
  >(`/classroom-attendance-links/${encodeURIComponent(id)}/resend-line`, {
    deliveryRequestId: crypto.randomUUID(),
  });
  return response.data.data.lineDelivery;
}

async function getLineGroupInvitation(
  schoolId: number,
): Promise<ClassroomLineGroupInvitation | null> {
  const response = await apiClient.get<
    DataEnvelope<ClassroomLineGroupInvitation | null>
  >("/classroom-attendance-links/line-group-invitation", {
    params: { schoolId },
  });
  return response.data.data;
}

async function issueLineGroupInvitation(
  input: ClassroomLineGroupInvitationInput,
): Promise<ClassroomLineGroupInvitation> {
  const response = await apiClient.post<
    DataEnvelope<ClassroomLineGroupInvitation>
  >("/classroom-attendance-links/line-group-invitation", input);
  return response.data.data;
}

async function updateLineGroupInvitation(
  input: ClassroomLineGroupInvitationInput & { invitationId: string },
): Promise<ClassroomLineGroupInvitation> {
  const response = await apiClient.patch<
    DataEnvelope<ClassroomLineGroupInvitation>
  >(
    `/classroom-attendance-links/line-group-invitation/${encodeURIComponent(input.invitationId)}`,
    {
      schoolId: input.schoolId,
      startsAt: input.startsAt,
      expiresAt: input.expiresAt,
    },
  );
  return response.data.data;
}

async function revokeLineGroupInvitation(input: {
  invitationId: string;
  schoolId: number;
}): Promise<void> {
  await apiClient.post(
    `/classroom-attendance-links/line-group-invitation/${encodeURIComponent(input.invitationId)}/revoke`,
    undefined,
    { params: { schoolId: input.schoolId } },
  );
}

export const classroomLinksService = {
  createAssignment,
  getUsage,
  listIssued,
  list,
  bulkCreate,
  redisplay,
  rotate,
  deactivate,
  resendLine,
  getLineGroupInvitation,
  issueLineGroupInvitation,
  updateLineGroupInvitation,
  revokeLineGroupInvitation,
};
