import { useMutation } from "@tanstack/react-query";
import { importService } from "../api/import.service";
import type { ImportPreviewResult, ImportResult } from "../types/import.types";

interface SubmitImportVariables {
  file: File;
  mapping?: Record<string, string>;
  onProgress?: (percent: number) => void;
}

export function useSubmitImport() {
  return useMutation<ImportResult, Error, SubmitImportVariables>({
    mutationFn: ({ file, mapping, onProgress }) =>
      importService.submitImport({ file, mapping, onProgress }),
  });
}

export function usePreviewImport() {
  return useMutation<ImportPreviewResult, Error, SubmitImportVariables>({
    mutationFn: ({ file, mapping, onProgress }) =>
      importService.previewImport({ file, mapping, onProgress }),
  });
}
