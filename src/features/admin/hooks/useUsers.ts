import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { adminService, type UserListQuery } from "../api/admin.service";
import type {
  BulkReissueStudentAccountsPayload,
  BulkReissueStudentAccountsResponse,
  AccountDeactivationPayload,
  AccountReactivateResponse,
  DeactivateStudentAccountResponse,
  CreateUserResponse,
  ManagedUser,
  RoleDefinition,
  StudentAccountBatchCredentialResponse,
  StudentAccountBatchJob,
  StudentAccountBatchJobResponse,
  StudentAccountBatchListQuery,
  StudentAccountFilter,
  StudentAccountListQuery,
  StudentAccountManagementItem,
  StudentAccountPaginationMeta,
  UserPaginationMeta,
  UserSavePayload,
} from "../types/admin.types";

export const USERS_QUERY_KEY = "admin-users";
export const USER_QUERY_KEY = "admin-user";
export const USER_DETAIL_QUERY_KEY = "admin-user-detail";
export const ROLES_CATALOG_QUERY_KEY = "admin-roles-catalog";
export const STUDENT_ACCOUNTS_QUERY_KEY = "admin-student-accounts";
export const STUDENT_ACCOUNT_BATCHES_QUERY_KEY = "admin-student-account-batches";

/** Poll while a job is still doing work; stop once it reaches a terminal state. */
const ACTIVE_BATCH_STATUSES: ReadonlySet<StudentAccountBatchJob["status"]> = new Set([
  "PENDING",
  "RUNNING",
]);
const BATCH_POLL_INTERVAL_MS = 2500;

const EMPTY_USERS: ManagedUser[] = [];
const EMPTY_ROLES: RoleDefinition[] = [];

interface UseUsersResult {
  users: ManagedUser[];
  meta: UserPaginationMeta | undefined;
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
}

interface UseStudentAccountsResult {
  accounts: StudentAccountManagementItem[];
  meta: StudentAccountPaginationMeta | undefined;
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
}

interface UseRolesCatalogResult {
  rolesCatalog: RoleDefinition[];
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
}

export function useUsers(query: UserListQuery = {}): UseUsersResult {
  const result = useQuery({
    queryKey: [USERS_QUERY_KEY, query],
    queryFn: () => adminService.getUsers(query),
    placeholderData: keepPreviousData,
  });

  return {
    users: result.data?.items ?? EMPTY_USERS,
    meta: result.data?.meta,
    isLoading: result.isLoading,
    isError: result.isError,
    refetch: () => {
      void result.refetch();
    },
  };
}

export function useUser(id: number | null) {
  return useQuery({
    queryKey: [USER_QUERY_KEY, id],
    queryFn: () => adminService.getUser(id ?? 0),
    enabled: id !== null,
  });
}

export function useUserDetail(id: number | null) {
  return useQuery({
    queryKey: [USER_DETAIL_QUERY_KEY, id],
    queryFn: () => adminService.getUserDetail(id ?? 0),
    enabled: id !== null,
  });
}

export function useStudentAccounts(
  query: StudentAccountListQuery = {},
): UseStudentAccountsResult {
  const result = useQuery({
    queryKey: [STUDENT_ACCOUNTS_QUERY_KEY, query],
    queryFn: () => adminService.getStudentAccounts(query),
    placeholderData: keepPreviousData,
  });

  return {
    accounts: result.data?.items ?? [],
    meta: result.data?.meta,
    isLoading: result.isLoading,
    isError: result.isError,
    refetch: () => {
      void result.refetch();
    },
  };
}

export function useRolesCatalog(): UseRolesCatalogResult {
  const result = useQuery({
    queryKey: [ROLES_CATALOG_QUERY_KEY],
    queryFn: adminService.getRolesCatalog,
  });
  return {
    rolesCatalog: result.data ?? EMPTY_ROLES,
    isLoading: result.isLoading,
    isError: result.isError,
    refetch: () => {
      void result.refetch();
    },
  };
}

interface SaveUserVariables {
  id: number | null;
  payload: UserSavePayload;
}

export function useSaveUser() {
  const queryClient = useQueryClient();

  return useMutation<CreateUserResponse | void, Error, SaveUserVariables>({
    mutationFn: ({ id, payload }) =>
      id ? adminService.updateUser(id, payload) : adminService.createUser(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [USERS_QUERY_KEY] });
      void queryClient.invalidateQueries({ queryKey: [USER_QUERY_KEY] });
      void queryClient.invalidateQueries({ queryKey: [STUDENT_ACCOUNTS_QUERY_KEY] });
    },
  });
}

export function useBulkReissueStudentTemporaryPasswords() {
  const queryClient = useQueryClient();

  return useMutation<
    BulkReissueStudentAccountsResponse,
    Error,
    BulkReissueStudentAccountsPayload
  >({
    mutationFn: adminService.bulkReissueStudentTemporaryPasswords,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [USERS_QUERY_KEY] });
      void queryClient.invalidateQueries({ queryKey: [USER_QUERY_KEY] });
      void queryClient.invalidateQueries({ queryKey: [STUDENT_ACCOUNTS_QUERY_KEY] });
    },
  });
}

export function useDeactivateStudentAccount() {
  const queryClient = useQueryClient();

  return useMutation<
    DeactivateStudentAccountResponse,
    Error,
    { id: number; payload: AccountDeactivationPayload }
  >({
    mutationFn: ({ id, payload }) => adminService.deactivateStudentAccount(id, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [USERS_QUERY_KEY] });
      void queryClient.invalidateQueries({ queryKey: [USER_QUERY_KEY] });
      void queryClient.invalidateQueries({ queryKey: [STUDENT_ACCOUNTS_QUERY_KEY] });
    },
  });
}

export function useReactivateStudentAccount() {
  const queryClient = useQueryClient();

  return useMutation<AccountReactivateResponse, Error, number>({
    mutationFn: adminService.reactivateStudentAccount,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [USERS_QUERY_KEY] });
      void queryClient.invalidateQueries({ queryKey: [USER_QUERY_KEY] });
      void queryClient.invalidateQueries({ queryKey: [STUDENT_ACCOUNTS_QUERY_KEY] });
    },
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, number>({
    mutationFn: (id) => adminService.deleteUser(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [USERS_QUERY_KEY] });
      void queryClient.invalidateQueries({ queryKey: [USER_QUERY_KEY] });
    },
  });
}

export function useDeactivateAccount() {
  const queryClient = useQueryClient();

  return useMutation<
    DeactivateStudentAccountResponse,
    Error,
    { id: number; payload: AccountDeactivationPayload }
  >({
    mutationFn: ({ id, payload }) => adminService.deactivateAccount(id, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [USERS_QUERY_KEY] });
      void queryClient.invalidateQueries({ queryKey: [USER_QUERY_KEY] });
      void queryClient.invalidateQueries({ queryKey: [STUDENT_ACCOUNTS_QUERY_KEY] });
    },
  });
}

export function useReactivateAccount() {
  const queryClient = useQueryClient();

  return useMutation<AccountReactivateResponse, Error, number>({
    mutationFn: adminService.reactivateAccount,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [USERS_QUERY_KEY] });
      void queryClient.invalidateQueries({ queryKey: [USER_QUERY_KEY] });
      void queryClient.invalidateQueries({ queryKey: [STUDENT_ACCOUNTS_QUERY_KEY] });
    },
  });
}

export function useReissueTemporaryPassword() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: adminService.reissueTemporaryPassword,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [USERS_QUERY_KEY] });
      void queryClient.invalidateQueries({ queryKey: [USER_QUERY_KEY] });
      void queryClient.invalidateQueries({ queryKey: [STUDENT_ACCOUNTS_QUERY_KEY] });
    },
  });
}

// --- Async large-batch generation jobs ---
export function useStudentAccountBatches(query: StudentAccountBatchListQuery = {}) {
  return useQuery({
    queryKey: [STUDENT_ACCOUNT_BATCHES_QUERY_KEY, query],
    queryFn: () => adminService.getStudentAccountBatches(query),
    placeholderData: keepPreviousData,
    // Keep the list live while any job is still running.
    refetchInterval: (result) =>
      result.state.data?.data.some((job) => ACTIVE_BATCH_STATUSES.has(job.status))
        ? BATCH_POLL_INTERVAL_MS
        : false,
  });
}

export function useStudentAccountBatch(id: string | null) {
  return useQuery({
    queryKey: [STUDENT_ACCOUNT_BATCHES_QUERY_KEY, "detail", id],
    queryFn: () => adminService.getStudentAccountBatch(id ?? ""),
    enabled: id !== null,
    refetchInterval: (result) =>
      result.state.data && ACTIVE_BATCH_STATUSES.has(result.state.data.data.status)
        ? BATCH_POLL_INTERVAL_MS
        : false,
  });
}

export function useEnqueueStudentAccountBatch() {
  const queryClient = useQueryClient();

  return useMutation<StudentAccountBatchJobResponse, Error, StudentAccountFilter>({
    mutationFn: adminService.enqueueStudentAccountBatch,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [STUDENT_ACCOUNT_BATCHES_QUERY_KEY] });
    },
  });
}

export function useResumeStudentAccountBatch() {
  const queryClient = useQueryClient();

  return useMutation<StudentAccountBatchJobResponse, Error, string>({
    mutationFn: adminService.resumeStudentAccountBatch,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [STUDENT_ACCOUNT_BATCHES_QUERY_KEY] });
    },
  });
}

export function useCancelStudentAccountBatch() {
  const queryClient = useQueryClient();

  return useMutation<StudentAccountBatchJobResponse, Error, string>({
    mutationFn: adminService.cancelStudentAccountBatch,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [STUDENT_ACCOUNT_BATCHES_QUERY_KEY] });
    },
  });
}

export function useDownloadStudentAccountBatchCredentials() {
  const queryClient = useQueryClient();

  return useMutation<
    StudentAccountBatchCredentialResponse,
    Error,
    { id: string; page?: number; limit?: number }
  >({
    mutationFn: ({ id, page, limit }) =>
      adminService.downloadStudentAccountBatchCredentials(id, { page, limit }),
    onSuccess: () => {
      // Rotating temp passwords changes account state.
      void queryClient.invalidateQueries({ queryKey: [STUDENT_ACCOUNTS_QUERY_KEY] });
    },
  });
}
