import { apiClient } from "../../../lib/api-client";
import {
  normalizePaginatedResponse,
  toPaginationParams,
} from "../../../lib/pagination";
import type {
  StudentStatus,
  StudentStatusListQuery,
  StudentStatusListResult,
  StudentStatusPayload,
} from "../types/student-status.types";

interface DataEnvelope<T> {
  data: T;
}

async function list(
  query: StudentStatusListQuery,
): Promise<StudentStatusListResult> {
  const params: Record<string, string> = toPaginationParams(query);
  if (query.includeInactive !== undefined) {
    params.includeInactive = String(query.includeInactive);
  }
  if (query.searchTerm?.trim()) params.searchTerm = query.searchTerm.trim();
  if (query.sortBy) params.sortBy = query.sortBy;
  if (query.sortDirection) params.sortDirection = query.sortDirection;
  const response = await apiClient.get("/student-statuses", {
    params,
  });
  return normalizePaginatedResponse<StudentStatus>(response.data, query);
}

async function create(payload: StudentStatusPayload): Promise<StudentStatus> {
  const response = await apiClient.post<DataEnvelope<StudentStatus>>(
    "/student-statuses",
    payload,
  );
  return response.data.data;
}

async function update(
  code: number,
  payload: Omit<StudentStatusPayload, "code">,
): Promise<StudentStatus> {
  const response = await apiClient.put<DataEnvelope<StudentStatus>>(
    `/student-statuses/${code}`,
    payload,
  );
  return response.data.data;
}

async function disable(code: number): Promise<StudentStatus> {
  const response = await apiClient.delete<DataEnvelope<StudentStatus>>(
    `/student-statuses/${code}`,
  );
  return response.data.data;
}

export const studentStatusService = { list, create, update, disable };
