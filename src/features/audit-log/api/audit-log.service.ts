import { apiClient } from "../../../lib/api-client";
import {
  normalizePaginatedResponse,
  toPaginationParams,
} from "../../../lib/pagination";
import type { AuditLogQuery, AuditLogResult, AuditLogEntry } from "../types/audit-log.types";

interface DataEnvelope<T> {
  data: T;
}

function unwrapData<T>(body: T | DataEnvelope<T>): T {
  return body && typeof body === "object" && "data" in body ? body.data : body;
}

function buildAuditLogParams(query: AuditLogQuery): Record<string, string> {
  const params: Record<string, string> = toPaginationParams(query);
  params.domain = query.domain;

  const action = query.action?.trim();
  if (action) {
    params.action = action;
  }
  const searchTerm = query.searchTerm?.trim();
  if (searchTerm) {
    params.searchTerm = searchTerm;
  }
  if (query.dateFrom) {
    params.dateFrom = query.dateFrom;
  }
  if (query.dateTo) {
    params.dateTo = query.dateTo;
  }
  const province = query.province?.trim();
  if (province) {
    params.province = province;
  }
  const district = query.district?.trim();
  if (district) {
    params.district = district;
  }
  const subDistrict = query.subDistrict?.trim();
  if (subDistrict) {
    params.subDistrict = subDistrict;
  }
  if (query.schoolId) {
    params.schoolId = String(query.schoolId);
  }
  if (query.caseId) {
    params.caseId = String(query.caseId);
  }
  if (query.taskType) {
    params.taskType = query.taskType;
  }
  const targetType = query.targetType?.trim();
  if (targetType) {
    params.targetType = targetType;
  }
  const targetId = query.targetId?.trim();
  if (targetId) {
    params.targetId = targetId;
  }

  return params;
}

async function getAuditLog(query: AuditLogQuery): Promise<AuditLogResult> {
  const response = await apiClient.get("/audit-log", {
    params: buildAuditLogParams(query),
  });
  const result = normalizePaginatedResponse<AuditLogEntry>(response.data, query);
  return {
    items: result.items,
    meta: result.meta,
  };
}

async function getAuditLogEntry(id: string): Promise<AuditLogEntry> {
  const response = await apiClient.get<AuditLogEntry | DataEnvelope<AuditLogEntry>>(
    `/audit-log/${id}`,
  );
  return unwrapData(response.data);
}

export const auditLogService = {
  getAuditLog,
  getAuditLogEntry,
};
