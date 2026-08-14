import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { araIdService } from "../api/araid.service";
import type { AraIdRecordInput, AraIdRecordListQuery } from "../types/araid.types";

export const ARAID_SESSION_QUERY_KEY = ["araid", "session"] as const;
export const ARAID_RECORDS_QUERY_KEY = ["araid", "records"] as const;

export function useAraIdSession() {
  return useQuery({
    queryKey: ARAID_SESSION_QUERY_KEY,
    queryFn: araIdService.getSessionProfile,
    retry: false,
  });
}

export function useAraIdLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ identityNumber, pin }: { identityNumber: string; pin: string }) =>
      araIdService.login(identityNumber, pin),
    meta: { suppressSuccessToast: true },
    onSuccess: (profile) => queryClient.setQueryData(ARAID_SESSION_QUERY_KEY, profile),
  });
}

export function useAraIdLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: araIdService.logout,
    meta: { suppressSuccessToast: true },
    onSuccess: () => queryClient.removeQueries({ queryKey: ARAID_SESSION_QUERY_KEY }),
  });
}

export function useAraIdReauthenticate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: araIdService.reauthenticate,
    meta: { suppressSuccessToast: true },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ARAID_SESSION_QUERY_KEY }),
  });
}

export function useAraIdRecords(query: AraIdRecordListQuery) {
  return useQuery({
    queryKey: [...ARAID_RECORDS_QUERY_KEY, query],
    queryFn: () => araIdService.listRecords(query),
    retry: false,
  });
}

export function useAraIdRecordDetail() {
  return useMutation({
    mutationFn: araIdService.getRecord,
    meta: { suppressSuccessToast: true },
  });
}

export function useCreateAraIdRecord() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: AraIdRecordInput) => araIdService.createRecord(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ARAID_RECORDS_QUERY_KEY }),
  });
}

export function useUpdateAraIdRecord() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<AraIdRecordInput> }) =>
      araIdService.updateRecord(id, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ARAID_RECORDS_QUERY_KEY }),
  });
}

export function useUpdateAraIdRecordStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, recordStatus }: {
      id: string;
      recordStatus: "ACTIVE" | "INACTIVE";
    }) => araIdService.updateRecordStatus(id, recordStatus),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ARAID_RECORDS_QUERY_KEY }),
  });
}
