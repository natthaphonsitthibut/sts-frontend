import { apiClient } from "../../../lib/api-client";
import {
  normalizePaginatedResponse,
  toPaginationParams,
  type PaginatedResult,
  type PaginatedSearchQuery,
} from "../../../lib/pagination";
import type {
  ManagedUser,
  CreateUserResponse,
  RoleDefinition,
  ReissueStudentPasswordResponse,
  RoleGroupForm,
  SettingsUpdatePayload,
  SettingsUpdateResponse,
  StudentAccountFilter,
  StudentAccountGenerateResponse,
  StudentAccountPreview,
  SystemSetting,
  UserSavePayload,
} from "../types/admin.types";

export interface UserListQuery extends PaginatedSearchQuery {
  province?: string;
  district?: string;
  subDistrict?: string;
  schoolId?: string;
  gradeLevelId?: number | null;
  room?: string;
}

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

function normalizeManagedUser(user: ManagedUser): ManagedUser {
  return {
    ...user,
    labels: user.labels || [],
    permissions: user.permissions || [],
    roles: user.roles || [],
  };
}

// --- System settings ---
async function getSettings(): Promise<SystemSetting[]> {
  const response = await apiClient.get<
    SystemSetting[] | DataEnvelope<SystemSetting[]>
  >("/settings");
  return normalizeArrayResponse(response.data);
}

async function updateSetting(
  key: string,
  payload: SettingsUpdatePayload,
): Promise<SettingsUpdateResponse> {
  const response = await apiClient.put<SettingsUpdateResponse>(
    `/settings/${encodeURIComponent(key)}`,
    payload,
  );
  return response.data;
}

// --- Users ---
async function getUsers(
  query: UserListQuery = {},
): Promise<PaginatedResult<ManagedUser>> {
  const params: Record<string, string> = toPaginationParams(query);
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

  const response = await apiClient.get("/users", { params });
  const result = normalizePaginatedResponse<ManagedUser>(response.data, query);
  return {
    ...result,
    items: result.items.map(normalizeManagedUser),
  };
}

async function getUser(id: number): Promise<ManagedUser> {
  const response = await apiClient.get<ManagedUser | DataEnvelope<ManagedUser>>(
    `/users/${id}`,
  );
  const user = "data" in response.data && response.data.data ? response.data.data : response.data;
  return normalizeManagedUser(user as ManagedUser);
}

async function reissueStudentTemporaryPassword(
  id: number,
): Promise<ReissueStudentPasswordResponse> {
  const response = await apiClient.post<ReissueStudentPasswordResponse>(
    `/users/student-accounts/${id}/reissue-temporary-password`,
  );
  return response.data;
}

async function getRolesCatalog(): Promise<RoleDefinition[]> {
  const response = await apiClient.get<
    RoleDefinition[] | DataEnvelope<RoleDefinition[]>
  >("/users/roles");
  return normalizeArrayResponse(response.data);
}

async function createUser(payload: UserSavePayload): Promise<CreateUserResponse> {
  const response = await apiClient.post<CreateUserResponse>("/users", payload);
  return response.data;
}

async function updateUser(id: number, payload: UserSavePayload): Promise<void> {
  await apiClient.put(`/users/${id}`, payload);
}

async function deleteUser(id: number): Promise<void> {
  await apiClient.delete(`/users/${id}`);
}

async function previewStudentAccounts(
  payload: StudentAccountFilter,
): Promise<StudentAccountPreview["data"]> {
  const response = await apiClient.post<StudentAccountPreview>(
    "/users/student-accounts/preview",
    payload,
  );
  return response.data.data;
}

async function generateStudentAccounts(
  payload: StudentAccountFilter,
): Promise<StudentAccountGenerateResponse> {
  const response = await apiClient.post<StudentAccountGenerateResponse>(
    "/users/student-accounts/generate",
    payload,
  );
  return response.data;
}

// --- Role groups ---
async function getRoleGroups(
  query: PaginatedSearchQuery = {},
): Promise<PaginatedResult<RoleDefinition>> {
  const params: Record<string, string> = toPaginationParams(query);
  const searchTerm = query.searchTerm?.trim();
  if (searchTerm) {
    params.searchTerm = searchTerm;
  }

  const response = await apiClient.get("/users/role-groups", { params });
  return normalizePaginatedResponse<RoleDefinition>(response.data, query);
}

async function createRoleGroup(payload: RoleGroupForm): Promise<void> {
  await apiClient.post("/users/role-groups", payload);
}

async function updateRoleGroup(
  roleName: string,
  payload: RoleGroupForm,
): Promise<void> {
  await apiClient.put(
    `/users/role-groups/${encodeURIComponent(roleName)}`,
    payload,
  );
}

async function deleteRoleGroup(roleName: string): Promise<void> {
  await apiClient.delete(
    `/users/role-groups/${encodeURIComponent(roleName)}`,
  );
}

export const adminService = {
  getSettings,
  updateSetting,
  getUsers,
  getUser,
  reissueStudentTemporaryPassword,
  getRolesCatalog,
  createUser,
  updateUser,
  deleteUser,
  previewStudentAccounts,
  generateStudentAccounts,
  getRoleGroups,
  createRoleGroup,
  updateRoleGroup,
  deleteRoleGroup,
};
