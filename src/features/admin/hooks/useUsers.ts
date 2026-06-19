import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import type { PaginatedSearchQuery, PaginationMeta } from "../../../lib/pagination";
import { adminService } from "../api/admin.service";
import type {
  CreateUserResponse,
  ManagedUser,
  RoleDefinition,
  UserSavePayload,
} from "../types/admin.types";

export const USERS_QUERY_KEY = "admin-users";
export const USER_QUERY_KEY = "admin-user";
export const ROLES_CATALOG_QUERY_KEY = "admin-roles-catalog";

const EMPTY_USERS: ManagedUser[] = [];
const EMPTY_ROLES: RoleDefinition[] = [];

interface UseUsersResult {
  users: ManagedUser[];
  meta: PaginationMeta | undefined;
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
}

export function useUsers(query: PaginatedSearchQuery = {}): UseUsersResult {
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

export function useRolesCatalog(): RoleDefinition[] {
  const result = useQuery({
    queryKey: [ROLES_CATALOG_QUERY_KEY],
    queryFn: adminService.getRolesCatalog,
  });
  return result.data ?? EMPTY_ROLES;
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
