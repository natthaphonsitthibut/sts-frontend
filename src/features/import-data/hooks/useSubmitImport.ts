import { useMutation } from "@tanstack/react-query";
import { importService } from "../api/import.service";
import type { ImportResult } from "../types/import.types";

interface SubmitImportVariables {
  file: File;
  onProgress?: (percent: number) => void;
}

export function useSubmitImport() {
  return useMutation<ImportResult, Error, SubmitImportVariables>({
    mutationFn: ({ file, onProgress }) =>
      importService.submitImport({ file, onProgress }),
  });
}
