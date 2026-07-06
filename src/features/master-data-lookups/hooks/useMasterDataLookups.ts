import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { masterDataLookupService } from "../api/master-data-lookup.service";
import type {
  MasterDataLookupListQuery,
  MasterDataLookupPayload,
  MasterDataLookupTable,
} from "../types/master-data-lookup.types";

export const MASTER_DATA_LOOKUPS_QUERY_KEY = "master-data-lookups";

export function useMasterDataLookups(
  query: MasterDataLookupListQuery,
  options: { enabled?: boolean } = {},
) {
  return useQuery({
    queryKey: [MASTER_DATA_LOOKUPS_QUERY_KEY, query],
    queryFn: () => masterDataLookupService.list(query),
    enabled: options.enabled ?? true,
  });
}

export function useSaveMasterDataLookup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      table,
      payload,
      isEdit,
    }: {
      id?: number | string;
      table: MasterDataLookupTable;
      payload: MasterDataLookupPayload;
      isEdit: boolean;
    }) =>
      isEdit && id !== undefined
        ? masterDataLookupService.update(table, id, payload)
        : masterDataLookupService.create(table, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [MASTER_DATA_LOOKUPS_QUERY_KEY] });
    },
  });
}
