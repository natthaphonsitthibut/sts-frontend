import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { importService } from "../api/import.service";
import type {
  AnyImportPreviewResult,
  ImportQuarantineFilterParams,
  ImportQuarantineEditableValues,
  ImportQuarantineListParams,
  ImportResult,
  ImportTarget,
  SchoolRosterImportContext,
} from "../types/import.types";

interface SubmitImportVariables {
  file: File;
  target: ImportTarget;
  mapping?: Record<string, string>;
  onProgress?: (percent: number) => void;
  importContext?: SchoolRosterImportContext;
}

export function useSubmitImport() {
  return useMutation<ImportResult, Error, SubmitImportVariables>({
    mutationFn: ({ file, target, mapping, onProgress, importContext }) =>
      importService.submitImport({
        file,
        target,
        mapping,
        onProgress,
        importContext,
      }),
  });
}

export function usePreviewImport() {
  return useMutation<AnyImportPreviewResult, Error, SubmitImportVariables>({
    mutationFn: ({ file, target, mapping, onProgress, importContext }) =>
      importService.previewImport({
        file,
        target,
        mapping,
        onProgress,
        importContext,
      }),
  });
}

export function useImportCatalog() {
  return useQuery({
    queryKey: ["imports", "catalog"],
    queryFn: () => importService.getCatalog(),
    staleTime: 5 * 60 * 1000,
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

export function useImportQuarantineItem(id?: string) {
  return useQuery({
    queryKey: ["imports", "quarantine", id],
    queryFn: () => importService.getQuarantine(id!),
    enabled: Boolean(id),
  });
}

export function useImportQuarantineLookups() {
  return useQuery({
    queryKey: ["imports", "quarantine", "lookups"],
    queryFn: () => importService.getQuarantineLookups(),
  });
}

export function useImportQuarantineCandidates(id?: string) {
  return useQuery({
    queryKey: ["imports", "quarantine", id, "candidates"],
    queryFn: () => importService.listQuarantineCandidates(id!),
    enabled: Boolean(id),
  });
}

export function useRetryableImportQuarantineSummary(
  filters: ImportQuarantineFilterParams,
  enabled = true,
) {
  return useQuery({
    queryKey: [
      "imports",
      "quarantine",
      "retryable-summary",
      filters.reasonCode,
      filters.search,
      filters.province,
      filters.district,
      filters.subDistrict,
      filters.schoolId,
    ],
    queryFn: () => importService.getRetryableQuarantineSummary(filters),
    enabled,
  });
}

export function useRetryReadyImportQuarantine() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (filters: ImportQuarantineFilterParams) =>
      importService.retryReadyQuarantine(filters),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["imports", "quarantine"],
      });
    },
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

export function useFixImportQuarantineValues() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      values,
    }: {
      id: string;
      values: ImportQuarantineEditableValues;
    }) => importService.fixQuarantineValues(id, values),
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
      params: ImportQuarantineFilterParams & {
        status: "PENDING" | "RESOLVED" | "REJECTED";
      },
    ) => importService.exportQuarantine(params),
  });
}
