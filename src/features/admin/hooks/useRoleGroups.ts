import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminService } from "../api/admin.service";
import type { RoleDefinition, RoleGroupForm } from "../types/admin.types";

export const ROLE_GROUPS_QUERY_KEY = "admin-role-groups";

const EMPTY_ROLE_GROUPS: RoleDefinition[] = [];

interface UseRoleGroupsResult {
  roleGroups: RoleDefinition[];
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
}

export function useRoleGroups(): UseRoleGroupsResult {
  const result = useQuery({
    queryKey: [ROLE_GROUPS_QUERY_KEY],
    queryFn: adminService.getRoleGroups,
  });

  return {
    roleGroups: result.data ?? EMPTY_ROLE_GROUPS,
    isLoading: result.isLoading,
    isError: result.isError,
    refetch: () => {
      void result.refetch();
    },
  };
}

interface SaveRoleGroupVariables {
  originalName: string | null;
  payload: RoleGroupForm;
}

export function useSaveRoleGroup() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, SaveRoleGroupVariables>({
    mutationFn: ({ originalName, payload }) =>
      originalName
        ? adminService.updateRoleGroup(originalName, payload)
        : adminService.createRoleGroup(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [ROLE_GROUPS_QUERY_KEY] });
    },
  });
}

export function useDeleteRoleGroup() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: (roleName) => adminService.deleteRoleGroup(roleName),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [ROLE_GROUPS_QUERY_KEY] });
    },
  });
}
