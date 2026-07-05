import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { studentsService } from "../api/students.service";
import type {
  CreatePiiExportRequestPayload,
  PiiExportRequestListQuery,
  RejectPiiExportRequestPayload,
} from "../types/students.types";

export const PII_EXPORT_REQUESTS_QUERY_KEY = "pii-export-requests";

export function usePiiExportRequests(query: PiiExportRequestListQuery = {}) {
  return useQuery({
    queryKey: [PII_EXPORT_REQUESTS_QUERY_KEY, query],
    queryFn: () => studentsService.listPiiExportRequests(query),
  });
}

export function useCreatePiiExportRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreatePiiExportRequestPayload) =>
      studentsService.createPiiExportRequest(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [PII_EXPORT_REQUESTS_QUERY_KEY] });
    },
  });
}

export function useApprovePiiExportRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => studentsService.approvePiiExportRequest(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [PII_EXPORT_REQUESTS_QUERY_KEY] });
    },
  });
}

export function useRejectPiiExportRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: RejectPiiExportRequestPayload) =>
      studentsService.rejectPiiExportRequest(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [PII_EXPORT_REQUESTS_QUERY_KEY] });
    },
  });
}

export function useDownloadPiiExportCsv() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (token: string) => studentsService.downloadPiiExportCsv(token),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [PII_EXPORT_REQUESTS_QUERY_KEY] });
    },
  });
}
