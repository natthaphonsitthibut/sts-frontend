import { apiClient } from "../../../lib/api-client";
import type {
  CreateDataExportJobPayload,
  DataExportCatalogResponse,
  DataExportJobListResponse,
  DataExportJobResponse,
} from "../types/data-export.types";

export async function fetchDataExportCatalog() {
  const response = await apiClient.get<DataExportCatalogResponse>("/data-exports/catalog");
  return response.data.data;
}

export async function fetchDataExportJobs() {
  const response = await apiClient.get<DataExportJobListResponse>("/data-exports/jobs", {
    params: { limit: 10 },
  });
  return response.data.data;
}

export async function createDataExportJob(payload: CreateDataExportJobPayload) {
  const response = await apiClient.post<DataExportJobResponse>("/data-exports/jobs", payload);
  return response.data.data;
}

export async function downloadDataExportJob(jobId: string) {
  const response = await apiClient.get<Blob>(`/data-exports/jobs/${jobId}/download`, {
    responseType: "blob",
  });
  return response.data;
}
