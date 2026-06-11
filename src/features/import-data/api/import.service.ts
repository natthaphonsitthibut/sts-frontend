import { apiClient } from "../../../lib/api-client";
import type { ImportMode, ImportResult } from "../types/import.types";

interface SubmitImportParams {
  file: File;
  target: ImportMode;
  /**
   * Column → field mapping. The interactive mapping UI is deferred, so this
   * defaults to empty; the backend response is surfaced as-is for feedback.
   */
  mapping?: Record<string, string>;
  onProgress?: (percent: number) => void;
}

async function submitImport({
  file,
  target,
  mapping = {},
  onProgress,
}: SubmitImportParams): Promise<ImportResult> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("target", target);
  formData.append("mapping", JSON.stringify(mapping));

  const response = await apiClient.post<ImportResult>(
    "/api/imports/bulk",
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
  submitImport,
};
