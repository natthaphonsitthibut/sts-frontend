import { apiClient } from "../../../lib/api-client";
import { normalizePaginatedResponse, toPaginationParams, type PaginatedResult, type PaginatedSearchQuery } from "../../../lib/pagination";
import type {
  AccountDeactivationPayload, AccountReactivateResponse, CreateUserResponse,
  DeactivateStudentAccountResponse, ManagedUser, ManagedUserDetail, RoleDefinition,
  RoleGroupForm, RoleGroupListQuery, SettingsUpdatePayload, SettingsUpdateResponse,
  SystemSetting, UserAddressDetail, UserAddressRevealPayload, UserNationalIdRevealResponse,
  UserPaginationMeta, UserSavePayload,
} from "../types/admin.types";

export interface UserListQuery extends PaginatedSearchQuery {
  sortBy?: "name" | "role" | "affiliation";
  sortOrder?: "asc" | "desc";
  province?: string;
  district?: string;
  subDistrict?: string;
  schoolId?: string;
  gradeLevelId?: number | null;
  room?: string;
  excludeRole?: string;
  accountStatus?: "PENDING_FIRST_LOGIN" | "ACTIVE" | "TEMP_PASSWORD_EXPIRED" | "DISABLED";
}

interface DataEnvelope<T> { data?: T; }

function normalizeArrayResponse<T>(data: T[] | DataEnvelope<T[]> | null | undefined): T[] {
  return Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : [];
}

function normalizeManagedUser(user: ManagedUser): ManagedUser {
  return { ...user, labels: user.labels || [], permissions: user.permissions || [], roles: user.roles || [] };
}

async function getSettings(): Promise<SystemSetting[]> {
  const response = await apiClient.get<SystemSetting[] | DataEnvelope<SystemSetting[]>>("/settings");
  return normalizeArrayResponse(response.data);
}

async function updateSetting(key: string, payload: SettingsUpdatePayload): Promise<SettingsUpdateResponse> {
  return (await apiClient.put<SettingsUpdateResponse>(`/settings/${encodeURIComponent(key)}`, payload)).data;
}

async function getUsers(query: UserListQuery = {}): Promise<PaginatedResult<ManagedUser> & { meta: UserPaginationMeta }> {
  const params: Record<string, string> = toPaginationParams(query);
  const fields: Array<[keyof UserListQuery, string]> = [
    ["searchTerm", "searchTerm"], ["province", "province"], ["district", "district"],
    ["subDistrict", "subDistrict"], ["schoolId", "schoolId"], ["room", "room"], ["excludeRole", "excludeRole"],
  ];
  for (const [source, target] of fields) {
    const value = query[source];
    if (typeof value === "string" && value.trim()) params[target] = value.trim();
  }
  if (query.gradeLevelId) params.gradeLevelId = String(query.gradeLevelId);
  if (query.accountStatus) params.accountStatus = query.accountStatus;
  if (query.sortBy) params.sortBy = query.sortBy;
  if (query.sortOrder) params.sortOrder = query.sortOrder;
  const response = await apiClient.get("/users", { params });
  const result = normalizePaginatedResponse<ManagedUser>(response.data, query);
  return { ...result, items: result.items.map(normalizeManagedUser) } as PaginatedResult<ManagedUser> & { meta: UserPaginationMeta };
}

async function getUser(id: number): Promise<ManagedUser> {
  const response = await apiClient.get<ManagedUser | DataEnvelope<ManagedUser>>(`/users/${id}`);
  return normalizeManagedUser(("data" in response.data && response.data.data ? response.data.data : response.data) as ManagedUser);
}

async function getUserDetail(id: number): Promise<ManagedUserDetail> {
  const response = await apiClient.get<ManagedUserDetail | DataEnvelope<ManagedUserDetail>>(`/users/${id}/detail`);
  return normalizeManagedUser(("data" in response.data && response.data.data ? response.data.data : response.data) as ManagedUser) as ManagedUserDetail;
}

async function revealUserAddress(id: number, payload: UserAddressRevealPayload): Promise<UserAddressDetail> {
  return (await apiClient.post<UserAddressDetail>(`/users/${id}/address-reveal`, payload)).data;
}

async function revealUserNationalId(id: number, payload: UserAddressRevealPayload): Promise<UserNationalIdRevealResponse> {
  return (await apiClient.post<UserNationalIdRevealResponse>(`/users/${id}/national-id-reveal`, payload)).data;
}

async function getRolesCatalog(): Promise<RoleDefinition[]> {
  const response = await apiClient.get<RoleDefinition[] | DataEnvelope<RoleDefinition[]>>("/users/roles");
  return normalizeArrayResponse(response.data);
}

async function createUser(payload: UserSavePayload): Promise<CreateUserResponse> { return (await apiClient.post<CreateUserResponse>("/users", payload)).data; }
async function updateUser(id: number, payload: UserSavePayload): Promise<void> { await apiClient.put(`/users/${id}`, payload); }
async function deleteUser(id: number): Promise<void> { await apiClient.delete(`/users/${id}`); }
async function updateUserPhoto(id: number, input: { photo?: File; remove?: boolean }): Promise<void> {
  const form = new FormData();
  if (input.photo) form.append("photo", input.photo);
  if (input.remove) form.append("removePhoto", "true");
  await apiClient.patch(`/users/${id}/photo`, form);
}
async function deactivateAccount(id: number, payload: AccountDeactivationPayload): Promise<DeactivateStudentAccountResponse> { return (await apiClient.post<DeactivateStudentAccountResponse>(`/users/${id}/deactivate`, payload)).data; }
async function reactivateAccount(id: number): Promise<AccountReactivateResponse> { return (await apiClient.post<AccountReactivateResponse>(`/users/${id}/reactivate`)).data; }

async function getRoleGroups(query: RoleGroupListQuery): Promise<PaginatedResult<RoleDefinition>> {
  const params: Record<string, string> = toPaginationParams(query);
  params.schoolId = String(query.schoolId);
  if (query.sortBy) params.sortBy = query.sortBy;
  if (query.sortDirection) params.sortDirection = query.sortDirection;
  if (query.searchTerm?.trim()) params.searchTerm = query.searchTerm.trim();
  return normalizePaginatedResponse<RoleDefinition>((await apiClient.get("/users/role-groups", { params })).data, query);
}
async function createRoleGroup(payload: RoleGroupForm): Promise<void> { await apiClient.post("/users/role-groups", payload); }
async function updateRoleGroup(roleName: string, payload: RoleGroupForm): Promise<void> { await apiClient.put(`/users/role-groups/${encodeURIComponent(roleName)}`, payload); }
async function deleteRoleGroup(roleName: string): Promise<void> { await apiClient.delete(`/users/role-groups/${encodeURIComponent(roleName)}`); }

export const adminService = {
  getSettings, updateSetting, getUsers, getUser, getUserDetail, revealUserAddress,
  revealUserNationalId, getRolesCatalog, createUser, updateUser, deleteUser,
  updateUserPhoto, deactivateAccount, reactivateAccount, getRoleGroups,
  createRoleGroup, updateRoleGroup, deleteRoleGroup,
};
