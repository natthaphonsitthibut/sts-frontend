import { apiClient } from "../../../lib/api-client";
import {
  type ImportPreviewResult,
  type ImportQuarantineCandidateResponse,
  type ImportQuarantineFilterParams,
  type ImportQuarantineEditableValues,
  type ImportQuarantineItem,
  type ImportQuarantineListParams,
  type ImportQuarantineLookupResponse,
  type ImportQuarantineResponse,
  type ImportQuarantineRetryResult,
  type ImportQuarantineRetrySummary,
  STUDENT_TERM_IMPORT_TARGET,
  type ImportResult,
} from "../types/import.types";

interface SubmitImportParams {
  file: File;
  /**
   * Column → field mapping. The interactive mapping UI is deferred, so this
   * defaults to empty; the backend response is surfaced as-is for feedback.
   */
  mapping?: Record<string, string>;
  onProgress?: (percent: number) => void;
  schools?: Array<{ id: number; name: string }>;
}

async function submitImport({
  file,
  mapping = {},
  onProgress,
  schools = [],
}: SubmitImportParams): Promise<ImportResult> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("target", STUDENT_TERM_IMPORT_TARGET);
  formData.append("mapping", JSON.stringify(mapping));
  if (schools.length > 0) {
    formData.append("schools", JSON.stringify(schools));
  }

  const response = await apiClient.post<ImportResult>(
    "/imports/bulk",
    formData,
    {
      onUploadProgress: (event) => {
        if (onProgress && event.total) {
          onProgress(Math.round((event.loaded / event.total) * 100));
        }
      },
    },
  );
  return response.data;
}

async function previewImport({
  file,
  mapping = {},
  onProgress,
}: SubmitImportParams): Promise<ImportPreviewResult> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("target", STUDENT_TERM_IMPORT_TARGET);
  formData.append("mapping", JSON.stringify(mapping));

  const response = await apiClient.post<ImportPreviewResult>(
    "/imports/preview",
    formData,
    {
      onUploadProgress: (event) => {
        if (onProgress && event.total) {
          onProgress(Math.round((event.loaded / event.total) * 100));
        }
      },
    },
  );
  return response.data;
}

function quarantineFilterParams(
  filters: ImportQuarantineFilterParams,
): Record<string, string | number> {
  const search = filters.search?.trim();
  return {
    ...(filters.reasonCode ? { reasonCode: filters.reasonCode } : {}),
    ...(search ? { search } : {}),
    ...(filters.province ? { province: filters.province } : {}),
    ...(filters.district ? { district: filters.district } : {}),
    ...(filters.subDistrict ? { subDistrict: filters.subDistrict } : {}),
    ...(filters.schoolId ? { schoolId: filters.schoolId } : {}),
  };
}

async function listQuarantine(
  params: ImportQuarantineListParams,
): Promise<ImportQuarantineResponse> {
  const response = await apiClient.get<ImportQuarantineResponse>(
    "/imports/quarantine",
    {
      params: {
        page: params.page,
        limit: params.limit,
        ...(params.status ? { status: params.status } : {}),
        ...quarantineFilterParams(params),
      },
    },
  );
  return response.data;
}

async function getQuarantine(id: string): Promise<ImportQuarantineItem> {
  const response = await apiClient.get<ImportQuarantineItem>(
    `/imports/quarantine/${id}`,
  );
  return response.data;
}

async function getQuarantineLookups(): Promise<ImportQuarantineLookupResponse> {
  const response = await apiClient.get<ImportQuarantineLookupResponse>(
    "/imports/quarantine-lookups",
  );
  return response.data;
}

async function listQuarantineCandidates(
  id: string,
): Promise<ImportQuarantineCandidateResponse> {
  const response = await apiClient.get<ImportQuarantineCandidateResponse>(
    `/imports/quarantine/${id}/candidates`,
  );
  return response.data;
}

async function getRetryableQuarantineSummary(
  filters: ImportQuarantineFilterParams,
): Promise<ImportQuarantineRetrySummary> {
  const response = await apiClient.get<ImportQuarantineRetrySummary>(
    "/imports/quarantine-retryable-summary",
    { params: quarantineFilterParams(filters) },
  );
  return response.data;
}

async function retryReadyQuarantine(
  filters: ImportQuarantineFilterParams,
): Promise<ImportQuarantineRetryResult> {
  const response = await apiClient.post<ImportQuarantineRetryResult>(
    "/imports/quarantine-retry",
    quarantineFilterParams(filters),
  );
  return response.data;
}

async function resolveQuarantine(
  id: string,
  body: { action: "RESOLVE" | "REJECT"; candidateKey?: string; note?: string },
): Promise<{ id: string; status: "RESOLVED" | "REJECTED" }> {
  const response = await apiClient.post<{
    id: string;
    status: "RESOLVED" | "REJECTED";
  }>(`/imports/quarantine/${id}/resolve`, body);
  return response.data;
}

async function fixQuarantineValues(
  id: string,
  values: ImportQuarantineEditableValues,
): Promise<{ id: string; status: "RESOLVED"; changedFields: string[] }> {
  const response = await apiClient.patch<{
    id: string;
    status: "RESOLVED";
    changedFields: string[];
  }>(`/imports/quarantine/${id}/values`, { values });
  return response.data;
}

async function exportQuarantine(
  params: ImportQuarantineFilterParams & { status: "PENDING" | "RESOLVED" | "REJECTED" },
): Promise<Blob> {
  const response = await apiClient.get<Blob>("/imports/quarantine-export", {
    params: { status: params.status, ...quarantineFilterParams(params) },
    responseType: "blob",
  });
  return response.data;
}

export const importService = {
  previewImport,
  submitImport,
  getQuarantine,
  getQuarantineLookups,
  listQuarantine,
  listQuarantineCandidates,
  getRetryableQuarantineSummary,
  retryReadyQuarantine,
  resolveQuarantine,
  fixQuarantineValues,
  exportQuarantine,
};
