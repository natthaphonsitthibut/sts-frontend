import { apiClient } from "../../../lib/api-client";
import {
  type AnyImportPreviewResult,
  type ImportCatalogResponse,
  type ImportQuarantineCandidateResponse,
  type ImportQuarantineFilterParams,
  type ImportQuarantineEditableValues,
  type ImportQuarantineItem,
  type ImportQuarantineListParams,
  type ImportQuarantineLookupResponse,
  type ImportQuarantineResponse,
  type ImportQuarantineRetryResult,
  type ImportQuarantineRetrySummary,
  type ImportTarget,
  type ImportResult,
  type SchoolRosterImportContext,
  type TeacherImportPreviewResult,
  type TeacherImportResult,
} from "../types/import.types";

interface SubmitImportParams {
  file: File;
  target: ImportTarget;
  /**
   * Column → field mapping. The interactive mapping UI is deferred, so this
   * defaults to empty; the backend response is surfaced as-is for feedback.
   */
  mapping?: Record<string, string>;
  onProgress?: (percent: number) => void;
  importContext?: SchoolRosterImportContext;
}

function appendImportContext(
  formData: FormData,
  context?: SchoolRosterImportContext,
): void {
  if (!context) return;
  if (context.schoolId) formData.append("schoolId", String(context.schoolId));
  if (context.schoolTermId)
    formData.append("schoolTermId", String(context.schoolTermId));
  if (context.classroomId)
    formData.append("classroomId", String(context.classroomId));
}

async function getCatalog(): Promise<ImportCatalogResponse> {
  const response =
    await apiClient.get<ImportCatalogResponse>("/imports/catalog");
  return response.data;
}

async function submitImport({
  file,
  target,
  mapping = {},
  onProgress,
  importContext,
}: SubmitImportParams): Promise<ImportResult> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("target", target);
  formData.append("mapping", JSON.stringify(mapping));
  appendImportContext(formData, importContext);
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
  target,
  mapping = {},
  onProgress,
  importContext,
}: SubmitImportParams): Promise<AnyImportPreviewResult> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("target", target);
  formData.append("mapping", JSON.stringify(mapping));
  appendImportContext(formData, importContext);

  const response = await apiClient.post<AnyImportPreviewResult>(
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

async function previewTeacherImport(
  file: File,
  schoolId: number,
): Promise<TeacherImportPreviewResult> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("schoolId", String(schoolId));
  const response = await apiClient.post<TeacherImportPreviewResult>(
    "/imports/teachers/preview",
    formData,
  );
  return response.data;
}

async function submitTeacherImport(
  file: File,
  schoolId: number,
): Promise<TeacherImportResult> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("schoolId", String(schoolId));
  const response = await apiClient.post<TeacherImportResult>(
    "/imports/teachers/bulk",
    formData,
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
  params: ImportQuarantineFilterParams & {
    status: "PENDING" | "RESOLVED" | "REJECTED";
  },
): Promise<Blob> {
  const response = await apiClient.get<Blob>("/imports/quarantine-export", {
    params: { status: params.status, ...quarantineFilterParams(params) },
    responseType: "blob",
  });
  return response.data;
}

export const importService = {
  getCatalog,
  previewImport,
  submitImport,
  previewTeacherImport,
  submitTeacherImport,
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
