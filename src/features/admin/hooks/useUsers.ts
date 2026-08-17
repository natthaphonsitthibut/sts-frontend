import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminService, type UserListQuery } from "../api/admin.service";
import type {
  AccountDeactivationPayload,
  AccountReactivateResponse,
  CreateUserResponse,
  DeactivateStudentAccountResponse,
  ManagedUser,
  RoleDefinition,
  UserPaginationMeta,
  UserSavePayload,
} from "../types/admin.types";

export const USERS_QUERY_KEY = "admin-users";
export const USER_QUERY_KEY = "admin-user";
export const USER_DETAIL_QUERY_KEY = "admin-user-detail";
export const ROLES_CATALOG_QUERY_KEY = "admin-roles-catalog";

const EMPTY_USERS: ManagedUser[] = [];
const EMPTY_ROLES: RoleDefinition[] = [];

interface UseUsersResult {
  users: ManagedUser[];
  meta: UserPaginationMeta | undefined;
  isLoading: boolean;
  isError: boolean;
  dataUpdatedAt: number;
  refetch: () => void;
}

interface UseRolesCatalogResult {
  rolesCatalog: RoleDefinition[];
  isLoading: boolean;
  isError: boolean;
  dataUpdatedAt: number;
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
    dataUpdatedAt: result.dataUpdatedAt,
    refetch: () => { void result.refetch(); },
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

export function useRolesCatalog(): UseRolesCatalogResult {
  const result = useQuery({
    queryKey: [ROLES_CATALOG_QUERY_KEY],
    queryFn: adminService.getRolesCatalog,
  });
  return {
    rolesCatalog: result.data ?? EMPTY_ROLES,
    isLoading: result.isLoading,
    isError: result.isError,
    dataUpdatedAt: result.dataUpdatedAt,
    refetch: () => { void result.refetch(); },
  };
}

interface SaveUserVariables {
  id: number | null;
  payload: UserSavePayload;
  photo?: File | null;
  removePhoto?: boolean;
}

export function useSaveUser() {
  const queryClient = useQueryClient();
  return useMutation<CreateUserResponse | void, Error, SaveUserVariables>({
    mutationFn: async ({ id, payload, photo, removePhoto }) => {
      const result = id
        ? await adminService.updateUser(id, payload)
        : await adminService.createUser(payload);
      const savedId = id ?? result?.userId ?? null;
      if (savedId && (photo || removePhoto)) {
        await adminService.updateUserPhoto(savedId, { photo: photo ?? undefined, remove: removePhoto });
      }
      return result;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [USERS_QUERY_KEY] });
      void queryClient.invalidateQueries({ queryKey: [USER_QUERY_KEY] });
    },
  });
}

export function useDeactivateAccount() {
  const queryClient = useQueryClient();
  return useMutation<DeactivateStudentAccountResponse, Error, { id: number; payload: AccountDeactivationPayload }>({
    mutationFn: ({ id, payload }) => adminService.deactivateAccount(id, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [USERS_QUERY_KEY] });
      void queryClient.invalidateQueries({ queryKey: [USER_QUERY_KEY] });
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
    },
  });
}
