import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { loginLinksService } from "../api/login-links.service";
import type {
  LinkAdminPayload,
  LinkAdminResponse,
  LoginLink,
  LoginLinkCreatePayload,
  LoginLinkCreateResponse,
  RoleOption,
} from "../types/login-links.types";

export const LOGIN_LINKS_QUERY_KEY = "login-links";
export const LOGIN_LINK_ROLES_QUERY_KEY = "login-link-roles";

const EMPTY_LINKS: LoginLink[] = [];
const EMPTY_ROLES: RoleOption[] = [];

interface UseLoginLinksResult {
  links: LoginLink[];
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
}

export function useLoginLinks(): UseLoginLinksResult {
  const result = useQuery({
    queryKey: [LOGIN_LINKS_QUERY_KEY],
    queryFn: loginLinksService.getLoginLinks,
  });

  return {
    links: result.data ?? EMPTY_LINKS,
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

export function useCreateLoginLink() {
  const queryClient = useQueryClient();
  return useMutation<LoginLinkCreateResponse, Error, LoginLinkCreatePayload>({
    mutationFn: (payload) => loginLinksService.createLoginLink(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [LOGIN_LINKS_QUERY_KEY] });
    },
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
