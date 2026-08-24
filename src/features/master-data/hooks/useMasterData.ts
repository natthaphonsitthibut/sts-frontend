import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { masterDataService } from "../api/master-data.service";
import type {
  CodedMasterDataPayload,
  MasterDataCatalog,
  MasterDataListQuery,
  ReferralAgencyPayload,
} from "../types/master-data.types";

export const MASTER_DATA_QUERY_KEY = "master-data";

export function useCodedMasterData(
  catalog: Exclude<MasterDataCatalog, "referral-agencies">,
  query: MasterDataListQuery,
  enabled = true,
) {
  return useQuery({
    queryKey: [MASTER_DATA_QUERY_KEY, catalog, query],
    queryFn: () => masterDataService.listCoded(catalog, query),
    enabled,
  });
}

export function useReferralAgencies(
  query: MasterDataListQuery,
  enabled = true,
) {
  return useQuery({
    queryKey: [MASTER_DATA_QUERY_KEY, "referral-agencies", query],
    queryFn: () => masterDataService.listAgencies(query),
    enabled,
  });
}

export function useSaveCodedMasterData() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      catalog,
      code,
      isEdit,
      payload,
    }: {
      catalog: Exclude<MasterDataCatalog, "referral-agencies">;
      code: string;
      isEdit: boolean;
      payload: CodedMasterDataPayload;
    }) => {
      if (!isEdit) return masterDataService.createCoded(catalog, payload);
      return masterDataService.updateCoded(catalog, code, {
        labelTh: payload.labelTh,
        sortOrder: payload.sortOrder,
        isActive: payload.isActive,
        categoryCode: payload.categoryCode,
        sourceOnecCode: payload.sourceOnecCode,
        requiresDetail: payload.requiresDetail,
      });
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: [MASTER_DATA_QUERY_KEY] }),
  });
}

export function useDisableCodedMasterData() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      catalog,
      code,
    }: {
      catalog: Exclude<MasterDataCatalog, "referral-agencies">;
      code: string;
    }) => masterDataService.disableCoded(catalog, code),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: [MASTER_DATA_QUERY_KEY] }),
  });
}

export function useSaveReferralAgency() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: number | null;
      payload: ReferralAgencyPayload;
    }) =>
      id === null
        ? masterDataService.createAgency(payload)
        : masterDataService.updateAgency(id, payload),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: [MASTER_DATA_QUERY_KEY] }),
  });
}

export function useDisableReferralAgency() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: masterDataService.disableAgency,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: [MASTER_DATA_QUERY_KEY] }),
  });
}
