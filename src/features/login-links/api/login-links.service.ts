import { apiClient } from "../../../lib/api-client";
import type {
  LinkAdminPayload,
  LinkAdminResponse,
  LoginLink,
  LoginLinkCreatePayload,
  LoginLinkCreateResponse,
  RoleOption,
} from "../types/login-links.types";

interface DataEnvelope<T> {
  data?: T;
}

interface RoleCatalogEntry {
  name: string;
  label?: string;
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
  }));
}

async function createLoginLink(
  payload: LoginLinkCreatePayload,
): Promise<LoginLinkCreateResponse> {
  const response = await apiClient.post<LoginLinkCreateResponse>(
    "/api/tasks",
    payload,
  );
  return response.data;
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

export const loginLinksService = {
  getLoginLinks,
  getRoleOptions,
  createLoginLink,
  setLinkAdminLock,
};
