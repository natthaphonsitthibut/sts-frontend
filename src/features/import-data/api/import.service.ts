import { apiClient } from "../../../lib/api-client";
import {
  type ImportPreviewResult,
  type ImportQuarantineCandidate,
  type ImportQuarantineFilterParams,
  type ImportQuarantineListParams,
  type ImportQuarantineResponse,
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

async function listQuarantineCandidates(
  id: string,
): Promise<ImportQuarantineCandidate[]> {
  const response = await apiClient.get<{ items: ImportQuarantineCandidate[] }>(
    `/imports/quarantine/${id}/candidates`,
  );
  return response.data.items;
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

async function exportQuarantine(
  params: ImportQuarantineFilterParams & { status: "PENDING" | "REJECTED" },
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
  listQuarantine,
  listQuarantineCandidates,
  resolveQuarantine,
  exportQuarantine,
};
