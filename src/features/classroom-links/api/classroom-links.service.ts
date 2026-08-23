import { apiClient } from "../../../lib/api-client";
import type {
  BulkCreateClassroomLinksResult,
  ClassroomLinkActionResult,
  ClassroomLinkDelivery,
  ClassroomLinkListParams,
  ClassroomLinkListResponse,
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

async function bulkCreate(input: {
  schoolId: number;
  schoolTermId: number;
  classroomIds?: number[];
  allClassrooms?: boolean;
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

export const classroomLinksService = {
  list,
  bulkCreate,
  redisplay,
  rotate,
  deactivate,
  resendLine,
};
