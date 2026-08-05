import { apiClient } from "../../../lib/api-client";
import { toPaginationParams } from "../../../lib/pagination";
import type {
  MasterDataLookup,
  MasterDataLookupListQuery,
  MasterDataLookupListResult,
  MasterDataLookupPayload,
  MasterDataLookupTable,
} from "../types/master-data-lookup.types";

interface MasterDataLookupListResponse {
  rows?: MasterDataLookup[];
  totalCount?: number;
  page?: number;
  limit?: number;
}

function normalizeListResponse(
  body: MasterDataLookupListResponse,
  query: MasterDataLookupListQuery,
): MasterDataLookupListResult {
  const items = Array.isArray(body.rows) ? body.rows : [];
  const page = body.page ?? query.page;
  const limit = body.limit ?? query.limit;
  const totalCount = body.totalCount ?? items.length;

  return {
    items,
    meta: {
      page,
      limit,
      totalCount,
      totalPages: limit > 0 ? Math.ceil(totalCount / limit) : 0,
    },
  };
}

async function list(query: MasterDataLookupListQuery): Promise<MasterDataLookupListResult> {
  const params: Record<string, string> = toPaginationParams(query);
  if (query.searchTerm?.trim()) params.searchTerm = query.searchTerm.trim();

  const response = await apiClient.get<MasterDataLookupListResponse>(
    `/master-data/${query.table}`,
    { params },
  );
  return normalizeListResponse(response.data, query);
}

async function create(
  table: MasterDataLookupTable,
  payload: MasterDataLookupPayload,
): Promise<MasterDataLookup> {
  const response = await apiClient.post<MasterDataLookup>(`/master-data/${table}`, payload);
  return response.data;
}

async function update(
  table: MasterDataLookupTable,
  id: number | string,
  payload: MasterDataLookupPayload,
): Promise<MasterDataLookup> {
  const response = await apiClient.put<MasterDataLookup>(`/master-data/${table}/${id}`, payload);
  return response.data;
}

export const masterDataLookupService = { list, create, update };
