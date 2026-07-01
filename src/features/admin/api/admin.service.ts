import { apiClient } from "../../../lib/api-client";
import {
  normalizePaginatedResponse,
  toPaginationParams,
  type PaginatedResult,
  type PaginatedSearchQuery,
} from "../../../lib/pagination";
import type {
  BulkReissueStudentAccountsPayload,
  BulkReissueStudentAccountsResponse,
  AccountDeactivationPayload,
  AccountReactivateResponse,
  DeactivateStudentAccountResponse,
  ManagedUser,
  CreateUserResponse,
  RoleDefinition,
  ReissueStudentPasswordResponse,
  RoleGroupForm,
  SettingsUpdatePayload,
  SettingsUpdateResponse,
  StudentAccountBatchCredentialResponse,
  StudentAccountBatchJobResponse,
  StudentAccountBatchListQuery,
  StudentAccountBatchListResponse,
  StudentAccountFilter,
  StudentAccountGenerateResponse,
  StudentAccountListQuery,
  StudentAccountManagementItem,
  StudentAccountPaginationMeta,
  StudentAccountPreview,
  SystemSetting,
  UserPaginationMeta,
  UserSavePayload,
} from "../types/admin.types";

export interface UserListQuery extends PaginatedSearchQuery {
  province?: string;
  district?: string;
  subDistrict?: string;
  schoolId?: string;
  gradeLevelId?: number | null;
  room?: string;
  excludeRole?: string;
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
): Promise<PaginatedResult<ManagedUser> & { meta: UserPaginationMeta }> {
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
  if (query.excludeRole?.trim()) {
    params.excludeRole = query.excludeRole.trim();
  }

  const response = await apiClient.get("/users", { params });
  const result = normalizePaginatedResponse<ManagedUser>(response.data, query);
  return {
    ...result,
    items: result.items.map(normalizeManagedUser),
  } as PaginatedResult<ManagedUser> & { meta: UserPaginationMeta };
}

async function getUser(id: number): Promise<ManagedUser> {
  const response = await apiClient.get<ManagedUser | DataEnvelope<ManagedUser>>(
    `/users/${id}`,
  );
  const user = "data" in response.data && response.data.data ? response.data.data : response.data;
  return normalizeManagedUser(user as ManagedUser);
}

async function reissueTemporaryPassword(
  id: number,
): Promise<ReissueStudentPasswordResponse> {
  const response = await apiClient.post<ReissueStudentPasswordResponse>(
    `/users/${id}/reissue-temporary-password`,
  );
  return response.data;
}

function toStudentAccountParams(
  query: StudentAccountListQuery = {},
): Record<string, string> {
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
  if (query.schoolId) {
    params.schoolId = String(query.schoolId);
  }
  if (query.grade?.trim()) {
    params.grade = query.grade.trim();
  }
  if (query.room) {
    params.room = String(query.room);
  }
  if (query.accountStatus) {
    params.accountStatus = query.accountStatus;
  }
  if (query.onlyExpired) {
    params.onlyExpired = "true";
  }
  return params;
}

async function getStudentAccounts(
  query: StudentAccountListQuery = {},
): Promise<PaginatedResult<StudentAccountManagementItem> & { meta: StudentAccountPaginationMeta }> {
  const response = await apiClient.get("/users/student-accounts", {
    params: toStudentAccountParams(query),
  });
  return normalizePaginatedResponse<StudentAccountManagementItem>(response.data, query) as
    PaginatedResult<StudentAccountManagementItem> & { meta: StudentAccountPaginationMeta };
}

async function bulkReissueStudentTemporaryPasswords(
  payload: BulkReissueStudentAccountsPayload,
): Promise<BulkReissueStudentAccountsResponse> {
  const response = await apiClient.post<BulkReissueStudentAccountsResponse>(
    "/users/student-accounts/bulk-reissue-temporary-password",
    payload,
  );
  return response.data;
}

async function deactivateStudentAccount(
  id: number,
  payload?: AccountDeactivationPayload,
): Promise<DeactivateStudentAccountResponse> {
  const response = await apiClient.post<DeactivateStudentAccountResponse>(
    `/users/student-accounts/${id}/deactivate`,
    payload,
  );
  return response.data;
}

async function reactivateStudentAccount(id: number): Promise<AccountReactivateResponse> {
  const response = await apiClient.post<AccountReactivateResponse>(
    `/users/student-accounts/${id}/reactivate`,
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

async function deactivateAccount(
  id: number,
  payload: AccountDeactivationPayload,
): Promise<DeactivateStudentAccountResponse> {
  const response = await apiClient.post<DeactivateStudentAccountResponse>(
    `/users/${id}/deactivate`,
    payload,
  );
  return response.data;
}

async function reactivateAccount(id: number): Promise<AccountReactivateResponse> {
  const response = await apiClient.post<AccountReactivateResponse>(
    `/users/${id}/reactivate`,
  );
  return response.data;
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

// --- Async large-batch generation jobs ---
async function enqueueStudentAccountBatch(
  payload: StudentAccountFilter,
): Promise<StudentAccountBatchJobResponse> {
  const response = await apiClient.post<StudentAccountBatchJobResponse>(
    "/users/student-accounts/batch-jobs",
    payload,
  );
  return response.data;
}

async function getStudentAccountBatches(
  query: StudentAccountBatchListQuery = {},
): Promise<StudentAccountBatchListResponse> {
  const params: Record<string, string> = {};
  if (query.status) params.status = query.status;
  if (query.page) params.page = String(query.page);
  if (query.limit) params.limit = String(query.limit);
  const response = await apiClient.get<StudentAccountBatchListResponse>(
    "/users/student-accounts/batch-jobs",
    { params },
  );
  return response.data;
}

async function getStudentAccountBatch(
  id: string,
): Promise<StudentAccountBatchJobResponse> {
  const response = await apiClient.get<StudentAccountBatchJobResponse>(
    `/users/student-accounts/batch-jobs/${id}`,
  );
  return response.data;
}

async function resumeStudentAccountBatch(
  id: string,
): Promise<StudentAccountBatchJobResponse> {
  const response = await apiClient.post<StudentAccountBatchJobResponse>(
    `/users/student-accounts/batch-jobs/${id}/resume`,
  );
  return response.data;
}

async function cancelStudentAccountBatch(
  id: string,
): Promise<StudentAccountBatchJobResponse> {
  const response = await apiClient.post<StudentAccountBatchJobResponse>(
    `/users/student-accounts/batch-jobs/${id}/cancel`,
  );
  return response.data;
}

async function downloadStudentAccountBatchCredentials(
  id: string,
  query: { page?: number; limit?: number } = {},
): Promise<StudentAccountBatchCredentialResponse> {
  const params: Record<string, string> = {};
  if (query.page) params.page = String(query.page);
  if (query.limit) params.limit = String(query.limit);
  const response = await apiClient.post<StudentAccountBatchCredentialResponse>(
    `/users/student-accounts/batch-jobs/${id}/credentials`,
    undefined,
    { params },
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
  getStudentAccounts,
  reissueTemporaryPassword,
  bulkReissueStudentTemporaryPasswords,
  deactivateStudentAccount,
  reactivateStudentAccount,
  getRolesCatalog,
  createUser,
  updateUser,
  deleteUser,
  deactivateAccount,
  reactivateAccount,
  previewStudentAccounts,
  generateStudentAccounts,
  enqueueStudentAccountBatch,
  getStudentAccountBatches,
  getStudentAccountBatch,
  resumeStudentAccountBatch,
  cancelStudentAccountBatch,
  downloadStudentAccountBatchCredentials,
  getRoleGroups,
  createRoleGroup,
  updateRoleGroup,
  deleteRoleGroup,
};
