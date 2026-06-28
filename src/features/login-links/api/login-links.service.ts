import { apiClient } from "../../../lib/api-client";
import {
  normalizePaginatedResponse,
  toPaginationParams,
  type PaginatedResult,
} from "../../../lib/pagination";
import type {
  AdminLinkDetail,
  LinkAdminPayload,
  LinkAdminResponse,
  LoginLink,
  LoginLinkListQuery,
  LoginLinkSummary,
  RoleOption,
} from "../types/login-links.types";

interface DataEnvelope<T> {
  data?: T;
}

interface RoleCatalogEntry {
  name: string;
  label?: string;
  default_permissions?: string[];
  scope_mode?: RoleOption["scope_mode"];
}

export interface LoginLinksResult extends PaginatedResult<LoginLink> {
  summary: LoginLinkSummary;
}

function normalizeArrayResponse<T>(
  data: T[] | DataEnvelope<T[]> | null | undefined,
): T[] {
  if (Array.isArray(data)) {
    return data;
  }
  if (Array.isArray(data?.data)) {
    return data.data;
  }
  return [];
}

async function getLoginLinks(
  query: LoginLinkListQuery = {},
): Promise<LoginLinksResult> {
  const params: Record<string, string> = toPaginationParams(query);
  if (query.status && query.status !== "ALL") {
    params.status = query.status;
  }
  const searchTerm = query.searchTerm?.trim();
  if (searchTerm) {
    params.searchTerm = searchTerm;
  }
  if (query.province?.trim()) {
    params.province = query.province.trim();
  }
  if (query.district?.trim()) {
    params.district = query.district.trim();
  }
  if (query.subDistrict?.trim()) {
    params.subDistrict = query.subDistrict.trim();
  }
  if (query.schoolId?.trim()) {
    params.schoolId = query.schoolId.trim();
  }
  if (query.gradeLevelId) {
    params.gradeLevelId = String(query.gradeLevelId);
  }
  if (query.room?.trim()) {
    params.room = query.room.trim();
  }

  const response = await apiClient.get<
    | LoginLink[]
    | (DataEnvelope<LoginLink[]> & { summary?: Partial<LoginLinkSummary> })
  >("/tasks/login-links", { params });
  const result = normalizePaginatedResponse<LoginLink>(response.data, query);
  const summary = Array.isArray(response.data) ? undefined : response.data?.summary;
  return {
    ...result,
    summary: {
      total: summary?.total ?? result.meta.totalCount,
      active: summary?.active ?? 0,
      locked: summary?.locked ?? 0,
      expired: summary?.expired ?? 0,
    },
  };
}

async function getRoleOptions(): Promise<RoleOption[]> {
  const response = await apiClient.get<
    RoleCatalogEntry[] | DataEnvelope<RoleCatalogEntry[]>
  >("/users/roles");
  return normalizeArrayResponse(response.data).map((role) => ({
    name: role.name,
    label: role.label || role.name,
    default_permissions: role.default_permissions ?? [],
    scope_mode: role.scope_mode ?? "flexible",
  }));
}

async function setLinkAdminLock(
  linkId: string,
  payload: LinkAdminPayload,
): Promise<LinkAdminResponse> {
  const response = await apiClient.post<LinkAdminResponse>(
    `/task-links/${linkId}/admin-lock`,
    payload,
  );
  return response.data;
}

async function getAdminLinkDetail(
  linkId: string,
  date?: string,
): Promise<AdminLinkDetail> {
  const response = await apiClient.get<AdminLinkDetail>(
    `/task-links/${linkId}/detail`,
    { params: date ? { date } : undefined },
  );
  return response.data;
}

export const loginLinksService = {
  getLoginLinks,
  getRoleOptions,
  setLinkAdminLock,
  getAdminLinkDetail,
};
