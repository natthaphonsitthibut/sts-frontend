import { apiClient } from "../../../lib/api-client";
import {
  normalizePaginatedResponse,
  toPaginationParams,
} from "../../../lib/pagination";
import type {
  CodedMasterDataItem,
  CodedMasterDataPayload,
  MasterDataCatalog,
  MasterDataListQuery,
  MasterDataListResult,
  ReferralAgencyItem,
  ReferralAgencyPayload,
} from "../types/master-data.types";

interface DataEnvelope<T> {
  data: T;
}

function params(query: MasterDataListQuery): Record<string, string> {
  const result = toPaginationParams(query);
  if (query.searchTerm?.trim()) result.searchTerm = query.searchTerm.trim();
  if (query.includeInactive) result.includeInactive = "true";
  return result;
}

async function listCoded(
  catalog: Exclude<MasterDataCatalog, "referral-agencies">,
  query: MasterDataListQuery,
): Promise<MasterDataListResult<CodedMasterDataItem>> {
  const response = await apiClient.get(`/master-data/${catalog}`, {
    params: params(query),
  });
  return normalizePaginatedResponse<CodedMasterDataItem>(response.data, query);
}

async function createCoded(
  catalog: Exclude<MasterDataCatalog, "referral-agencies">,
  payload: CodedMasterDataPayload,
): Promise<CodedMasterDataItem> {
  const response = await apiClient.post<DataEnvelope<CodedMasterDataItem>>(
    `/master-data/${catalog}`,
    payload,
  );
  return response.data.data;
}

async function updateCoded(
  catalog: Exclude<MasterDataCatalog, "referral-agencies">,
  code: string,
  payload: Omit<CodedMasterDataPayload, "code">,
): Promise<CodedMasterDataItem> {
  const response = await apiClient.put<DataEnvelope<CodedMasterDataItem>>(
    `/master-data/${catalog}/${encodeURIComponent(code)}`,
    payload,
  );
  return response.data.data;
}

async function disableCoded(
  catalog: Exclude<MasterDataCatalog, "referral-agencies">,
  code: string,
): Promise<CodedMasterDataItem> {
  const response = await apiClient.delete<DataEnvelope<CodedMasterDataItem>>(
    `/master-data/${catalog}/${encodeURIComponent(code)}`,
  );
  return response.data.data;
}

async function listAgencies(
  query: MasterDataListQuery,
): Promise<MasterDataListResult<ReferralAgencyItem>> {
  const response = await apiClient.get("/master-data/referral-agencies", {
    params: params(query),
  });
  return normalizePaginatedResponse<ReferralAgencyItem>(response.data, query);
}

async function createAgency(
  payload: ReferralAgencyPayload,
): Promise<ReferralAgencyItem> {
  const response = await apiClient.post<DataEnvelope<ReferralAgencyItem>>(
    "/master-data/referral-agencies",
    payload,
  );
  return response.data.data;
}

async function updateAgency(
  id: number,
  payload: ReferralAgencyPayload,
): Promise<ReferralAgencyItem> {
  const response = await apiClient.put<DataEnvelope<ReferralAgencyItem>>(
    `/master-data/referral-agencies/${id}`,
    payload,
  );
  return response.data.data;
}

async function disableAgency(id: number): Promise<ReferralAgencyItem> {
  const response = await apiClient.delete<DataEnvelope<ReferralAgencyItem>>(
    `/master-data/referral-agencies/${id}`,
  );
  return response.data.data;
}

export const masterDataService = {
  createAgency,
  createCoded,
  disableAgency,
  disableCoded,
  listAgencies,
  listCoded,
  updateAgency,
  updateCoded,
};
