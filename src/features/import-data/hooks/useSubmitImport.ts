import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { importService } from "../api/import.service";
import type {
  ImportPreviewResult,
  ImportQuarantineFilterParams,
  ImportQuarantineListParams,
  ImportResult,
} from "../types/import.types";

interface SubmitImportVariables {
  file: File;
  mapping?: Record<string, string>;
  onProgress?: (percent: number) => void;
  schools?: Array<{ id: number; name: string }>;
}

export function useSubmitImport() {
  return useMutation<ImportResult, Error, SubmitImportVariables>({
    mutationFn: ({ file, mapping, onProgress, schools }) =>
      importService.submitImport({ file, mapping, onProgress, schools }),
  });
}

export function usePreviewImport() {
  return useMutation<ImportPreviewResult, Error, SubmitImportVariables>({
    mutationFn: ({ file, mapping, onProgress }) =>
      importService.previewImport({ file, mapping, onProgress }),
  });
}

export function useImportQuarantine(
  params: ImportQuarantineListParams,
  enabled = true,
) {
  return useQuery({
    queryKey: [
      "imports",
      "quarantine",
      params.page,
      params.limit,
      params.status,
      params.reasonCode,
      params.search,
      params.province,
      params.district,
      params.subDistrict,
      params.schoolId,
    ],
    queryFn: () => importService.listQuarantine(params),
    enabled,
  });
}

export function useImportQuarantineCandidates(id?: string) {
  return useQuery({
    queryKey: ["imports", "quarantine", id, "candidates"],
    queryFn: () => importService.listQuarantineCandidates(id!),
    enabled: Boolean(id),
  });
}

export function useResolveImportQuarantine() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...body
    }: {
      id: string;
      action: "RESOLVE" | "REJECT";
      candidateKey?: string;
      note?: string;
    }) => importService.resolveQuarantine(id, body),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["imports", "quarantine"],
      });
    },
  });
}

export function useExportImportQuarantine() {
  return useMutation({
    mutationFn: (
      params: ImportQuarantineFilterParams & { status: "PENDING" | "REJECTED" },
    ) => importService.exportQuarantine(params),
  });
}
