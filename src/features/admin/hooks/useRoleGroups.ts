import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import type { PaginationMeta } from "../../../lib/pagination";
import { adminService } from "../api/admin.service";
import type {
  RoleDefinition,
  RoleGroupForm,
  RoleGroupListQuery,
} from "../types/admin.types";

export const ROLE_GROUPS_QUERY_KEY = "admin-role-groups";

const EMPTY_ROLE_GROUPS: RoleDefinition[] = [];

interface UseRoleGroupsResult {
  roleGroups: RoleDefinition[];
  meta: PaginationMeta | undefined;
  isLoading: boolean;
  isError: boolean;
  dataUpdatedAt: number;
  refetch: () => void;
}

export function useRoleGroups(
  query: RoleGroupListQuery | null,
): UseRoleGroupsResult {
  const result = useQuery({
    queryKey: [ROLE_GROUPS_QUERY_KEY, query],
    queryFn: () => adminService.getRoleGroups(query!),
    enabled: Boolean(query),
    placeholderData: keepPreviousData,
  });

  return {
    roleGroups: result.data?.items ?? EMPTY_ROLE_GROUPS,
    meta: result.data?.meta,
    isLoading: result.isLoading,
    isError: result.isError,
    dataUpdatedAt: result.dataUpdatedAt,
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
