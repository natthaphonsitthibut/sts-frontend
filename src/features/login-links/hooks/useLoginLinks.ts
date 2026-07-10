import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import type { PaginationMeta } from "../../../lib/pagination";
import { loginLinksService } from "../api/login-links.service";
import type {
  AdminLinkDetail,
  LinkAdminPayload,
  LinkAdminResponse,
  LoginLink,
  LoginLinkListQuery,
  LoginLinkSummary,
  RoleOption,
} from "../types/login-links.types";

export const LOGIN_LINKS_QUERY_KEY = "login-links";
export const LOGIN_LINK_DETAIL_QUERY_KEY = "login-link-detail";
export const LOGIN_LINK_ROLES_QUERY_KEY = "login-link-roles";

const EMPTY_LINKS: LoginLink[] = [];
const EMPTY_ROLES: RoleOption[] = [];
const EMPTY_SUMMARY: LoginLinkSummary = {
  total: 0,
  active: 0,
  locked: 0,
  expired: 0,
  scheduled: 0,
};

interface UseLoginLinksResult {
  links: LoginLink[];
  meta: PaginationMeta | undefined;
  summary: LoginLinkSummary;
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
}

export function useLoginLinks(query: LoginLinkListQuery = {}): UseLoginLinksResult {
  const result = useQuery({
    queryKey: [LOGIN_LINKS_QUERY_KEY, query],
    queryFn: () => loginLinksService.getLoginLinks(query),
    placeholderData: keepPreviousData,
  });

  return {
    links: result.data?.items ?? EMPTY_LINKS,
    meta: result.data?.meta,
    summary: result.data?.summary ?? EMPTY_SUMMARY,
    isLoading: result.isLoading,
    isError: result.isError,
    refetch: () => {
      void result.refetch();
    },
  };
}

export function useLoginLinkRoles(): RoleOption[] {
  const result = useQuery({
    queryKey: [LOGIN_LINK_ROLES_QUERY_KEY],
    queryFn: loginLinksService.getRoleOptions,
  });
  return result.data ?? EMPTY_ROLES;
}

export function useLoginLinkDetail(id: string) {
  return useQuery<AdminLinkDetail>({
    queryKey: [LOGIN_LINK_DETAIL_QUERY_KEY, id],
    queryFn: () => loginLinksService.getAdminLinkDetail(id),
    enabled: id.length > 0,
  });
}

interface SetLinkLockVariables {
  linkId: string;
  payload: LinkAdminPayload;
}

export function useSetLinkLock() {
  const queryClient = useQueryClient();
  return useMutation<LinkAdminResponse, Error, SetLinkLockVariables>({
    mutationFn: ({ linkId, payload }) =>
      loginLinksService.setLinkAdminLock(linkId, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [LOGIN_LINKS_QUERY_KEY] });
    },
  });
}
