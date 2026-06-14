import { apiClient } from "../../../lib/api-client";
import type {
  AdminLinkDetail,
  LinkAdminPayload,
  LinkAdminResponse,
  LoginLink,
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

async function getLoginLinks(): Promise<LoginLink[]> {
  const response = await apiClient.get<LoginLink[] | DataEnvelope<LoginLink[]>>(
    "/api/tasks/login-links",
  );
  return normalizeArrayResponse(response.data);
}

async function getRoleOptions(): Promise<RoleOption[]> {
  const response = await apiClient.get<
    RoleCatalogEntry[] | DataEnvelope<RoleCatalogEntry[]>
  >("/api/users/roles");
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
    `/api/task-links/${linkId}/admin-lock`,
    payload,
  );
  return response.data;
}

async function getAdminLinkDetail(
  linkId: string,
  date?: string,
): Promise<AdminLinkDetail> {
  const response = await apiClient.get<AdminLinkDetail>(
    `/api/task-links/${linkId}/detail`,
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
