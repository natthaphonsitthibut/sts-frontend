import { apiClient } from "../../../lib/api-client";
import type {
  CreateSubjectPayload,
  Subject,
  SubjectListResponse,
  UpdateSubjectPayload,
} from "../types/timetable.types";

async function listSubjects(params?: {
  searchTerm?: string;
  isActive?: boolean;
  limit?: number;
}): Promise<SubjectListResponse> {
  const response = await apiClient.get<SubjectListResponse>("/subjects", {
    params: {
      searchTerm: params?.searchTerm || undefined,
      isActive: params?.isActive,
      limit: params?.limit ?? 200,
    },
  });
  return response.data;
}

async function createSubject(payload: CreateSubjectPayload): Promise<{ success: true; data: Subject }> {
  const response = await apiClient.post<{ success: true; data: Subject }>("/subjects", payload);
  return response.data;
}

async function updateSubject(
  id: number,
  payload: UpdateSubjectPayload,
): Promise<{ success: true; data: Subject }> {
  const response = await apiClient.patch<{ success: true; data: Subject }>(
    `/subjects/${id}`,
    payload,
  );
  return response.data;
}

export const subjectsService = { listSubjects, createSubject, updateSubject };
