import { apiClient } from "../../../lib/api-client";
import type {
  ManagedUser,
  CreateUserResponse,
  RoleDefinition,
  RoleGroupForm,
  SettingsUpdatePayload,
  SettingsUpdateResponse,
  SystemSetting,
  UserSavePayload,
} from "../types/admin.types";

interface DataEnvelope<T> {
  data?: T;
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

// --- System settings ---
async function getSettings(): Promise<SystemSetting[]> {
  const response = await apiClient.get<
    SystemSetting[] | DataEnvelope<SystemSetting[]>
  >("/api/settings");
  return normalizeArrayResponse(response.data);
}

async function updateSetting(
  key: string,
  payload: SettingsUpdatePayload,
): Promise<SettingsUpdateResponse> {
  const response = await apiClient.put<SettingsUpdateResponse>(
    `/api/settings/${encodeURIComponent(key)}`,
    payload,
  );
  return response.data;
}

// --- Users ---
async function getUsers(): Promise<ManagedUser[]> {
  const response = await apiClient.get<
    ManagedUser[] | DataEnvelope<ManagedUser[]>
  >("/api/users");
  return normalizeArrayResponse(response.data).map((user) => ({
    ...user,
    labels: user.labels || [],
    permissions: user.permissions || [],
    roles: user.roles || [],
  }));
}

async function getRolesCatalog(): Promise<RoleDefinition[]> {
  const response = await apiClient.get<
    RoleDefinition[] | DataEnvelope<RoleDefinition[]>
  >("/api/users/roles");
  return normalizeArrayResponse(response.data);
}

async function createUser(payload: UserSavePayload): Promise<CreateUserResponse> {
  const response = await apiClient.post<CreateUserResponse>("/api/users", payload);
  return response.data;
}

async function updateUser(id: number, payload: UserSavePayload): Promise<void> {
  await apiClient.put(`/api/users/${id}`, payload);
}

async function deleteUser(id: number): Promise<void> {
  await apiClient.delete(`/api/users/${id}`);
}

// --- Role groups ---
async function getRoleGroups(): Promise<RoleDefinition[]> {
  const response = await apiClient.get<
    RoleDefinition[] | DataEnvelope<RoleDefinition[]>
  >("/api/users/role-groups");
  return normalizeArrayResponse(response.data);
}

async function createRoleGroup(payload: RoleGroupForm): Promise<void> {
  await apiClient.post("/api/users/role-groups", payload);
}

async function updateRoleGroup(
  roleName: string,
  payload: RoleGroupForm,
): Promise<void> {
  await apiClient.put(
    `/api/users/role-groups/${encodeURIComponent(roleName)}`,
    payload,
  );
}

async function deleteRoleGroup(roleName: string): Promise<void> {
  await apiClient.delete(
    `/api/users/role-groups/${encodeURIComponent(roleName)}`,
  );
}

export const adminService = {
  getSettings,
  updateSetting,
  getUsers,
  getRolesCatalog,
  createUser,
  updateUser,
  deleteUser,
  getRoleGroups,
  createRoleGroup,
  updateRoleGroup,
  deleteRoleGroup,
};
