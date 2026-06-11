import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminService } from "../api/admin.service";
import type {
  CreateUserResponse,
  ManagedUser,
  RoleDefinition,
  UserSavePayload,
} from "../types/admin.types";

export const USERS_QUERY_KEY = "admin-users";
export const ROLES_CATALOG_QUERY_KEY = "admin-roles-catalog";

const EMPTY_USERS: ManagedUser[] = [];
const EMPTY_ROLES: RoleDefinition[] = [];

interface UseUsersResult {
  users: ManagedUser[];
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
}

export function useUsers(): UseUsersResult {
  const result = useQuery({
    queryKey: [USERS_QUERY_KEY],
    queryFn: adminService.getUsers,
  });

  return {
    users: result.data ?? EMPTY_USERS,
    isLoading: result.isLoading,
    isError: result.isError,
    refetch: () => {
      void result.refetch();
    },
  };
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
    },
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, number>({
    mutationFn: (id) => adminService.deleteUser(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [USERS_QUERY_KEY] });
    },
  });
}
