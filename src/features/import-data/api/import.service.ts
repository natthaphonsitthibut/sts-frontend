import { apiClient } from "../../../lib/api-client";
import {
  type ImportPreviewResult,
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
}

async function submitImport({
  file,
  mapping = {},
  onProgress,
}: SubmitImportParams): Promise<ImportResult> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("target", STUDENT_TERM_IMPORT_TARGET);
  formData.append("mapping", JSON.stringify(mapping));

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

export const importService = {
  previewImport,
  submitImport,
};
