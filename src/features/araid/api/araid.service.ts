import { apiClient } from "../../../lib/api-client";
import type {
  AraIdRecord,
  AraIdRecordInput,
  AraIdRecordListQuery,
  AraIdRecordListResult,
  AraIdRecordSummary,
  AraIdSessionProfile,
} from "../types/araid.types";

interface DataEnvelope<T> {
  success: true;
  data: T;
}

interface AraIdRecordListEnvelope extends DataEnvelope<AraIdRecordSummary[]> {
  meta: AraIdRecordListResult["meta"];
  counts: AraIdRecordListResult["counts"];
}

async function listRecords(query: AraIdRecordListQuery): Promise<AraIdRecordListResult> {
  const response = await apiClient.get<AraIdRecordListEnvelope>("/araid/records", {
    params: query,
  });
  return {
    data: response.data.data,
    meta: response.data.meta,
    counts: response.data.counts,
  };
}

async function getRecord(recordId: string): Promise<AraIdRecord> {
  const response = await apiClient.get<DataEnvelope<AraIdRecord>>(`/araid/records/${recordId}`);
  return response.data.data;
}

async function createRecord(payload: AraIdRecordInput): Promise<AraIdRecord> {
  const response = await apiClient.post<DataEnvelope<AraIdRecord>>("/araid/records", payload);
  return response.data.data;
}

async function updateRecord(
  recordId: string,
  payload: Partial<AraIdRecordInput>,
): Promise<AraIdRecord> {
  const response = await apiClient.put<DataEnvelope<AraIdRecord>>(
    `/araid/records/${recordId}`,
    payload,
  );
  return response.data.data;
}

async function updateRecordStatus(
  recordId: string,
  recordStatus: "ACTIVE" | "INACTIVE",
): Promise<AraIdRecord> {
  const response = await apiClient.patch<DataEnvelope<AraIdRecord>>(
    `/araid/records/${recordId}/status`,
    { recordStatus },
  );
  return response.data.data;
}

async function login(identityNumber: string, pin: string): Promise<AraIdSessionProfile> {
  const response = await apiClient.post<DataEnvelope<AraIdSessionProfile>>(
    "/araid/session/login",
    { identityNumber, pin },
  );
  return response.data.data;
}

async function getSessionProfile(): Promise<AraIdSessionProfile> {
  const response = await apiClient.get<DataEnvelope<AraIdSessionProfile>>(
    "/araid/session/me",
  );
  return response.data.data;
}

async function reauthenticate(pin: string): Promise<void> {
  await apiClient.post("/araid/session/reauthenticate", { pin });
}

async function logout(): Promise<void> {
  await apiClient.post("/araid/session/logout");
}

export const araIdService = {
  listRecords,
  getRecord,
  createRecord,
  updateRecord,
  updateRecordStatus,
  login,
  reauthenticate,
  getSessionProfile,
  logout,
};
