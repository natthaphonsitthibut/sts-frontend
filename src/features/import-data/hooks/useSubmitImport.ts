import { useMutation } from "@tanstack/react-query";
import { importService } from "../api/import.service";
import type { ImportMode, ImportResult } from "../types/import.types";

interface SubmitImportVariables {
  file: File;
  target: ImportMode;
  onProgress?: (percent: number) => void;
}

export function useSubmitImport() {
  return useMutation<ImportResult, Error, SubmitImportVariables>({
    mutationFn: ({ file, target, onProgress }) =>
      importService.submitImport({ file, target, onProgress }),
  });
}
