import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import type { PaginationMeta } from "../../../lib/pagination";
import type {
  LinkAdminPayload,
  LinkAdminResponse,
} from "../../login-links/types/login-links.types";
import { visitLinksService } from "../api/visit-links.service";
import type {
  VisitLink,
  VisitLinkListQuery,
  VisitLinkSummary,
} from "../types/visit-links.types";

export const VISIT_LINKS_QUERY_KEY = "visit-links";

const EMPTY_LINKS: VisitLink[] = [];
const EMPTY_SUMMARY: VisitLinkSummary = {
  total: 0,
  active: 0,
  locked: 0,
  expired: 0,
  scheduled: 0,
};

interface UseVisitLinksResult {
  links: VisitLink[];
  meta: PaginationMeta | undefined;
  summary: VisitLinkSummary;
  isLoading: boolean;
  isError: boolean;
  dataUpdatedAt: number;
  refetch: () => void;
}

export function useVisitLinks(query: VisitLinkListQuery = {}): UseVisitLinksResult {
  const result = useQuery({
    queryKey: [VISIT_LINKS_QUERY_KEY, query],
    queryFn: () => visitLinksService.getVisitLinksPage(query),
    placeholderData: keepPreviousData,
  });

  return {
    links: result.data?.items ?? EMPTY_LINKS,
    meta: result.data?.meta,
    summary: result.data?.summary ?? EMPTY_SUMMARY,
    isLoading: result.isLoading,
    isError: result.isError,
    dataUpdatedAt: result.dataUpdatedAt,
    refetch: () => {
      void result.refetch();
    },
  };
}

interface SetVisitLinkLockVariables {
  linkId: string;
  payload: LinkAdminPayload;
}

export function useSetVisitLinkLock() {
  const queryClient = useQueryClient();
  return useMutation<LinkAdminResponse, Error, SetVisitLinkLockVariables>({
    mutationFn: ({ linkId, payload }) =>
      visitLinksService.setLinkAdminLock(linkId, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [VISIT_LINKS_QUERY_KEY] });
    },
  });
}
