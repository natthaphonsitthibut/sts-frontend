import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { casesService } from "../api/cases.service";
import type { CaseListQuery, CasePaginationMeta, CaseRecord } from "../types/cases.types";

export const CASES_QUERY_KEY = "cases";

const EMPTY_CASES: CaseRecord[] = [];

interface UseCasesResult {
  cases: CaseRecord[];
  meta: CasePaginationMeta | undefined;
  isLoading: boolean;
  isError: boolean;
  dataUpdatedAt: number;
  refetch: () => void;
}

export function useCases(query: CaseListQuery = {}): UseCasesResult {
  const result = useQuery({
    queryKey: [CASES_QUERY_KEY, query],
    queryFn: () => casesService.getCases(query),
    placeholderData: keepPreviousData,
  });

  return {
    cases: result.data?.items ?? EMPTY_CASES,
    meta: result.data?.meta,
    isLoading: result.isLoading,
    isError: result.isError,
    dataUpdatedAt: result.dataUpdatedAt,
    refetch: () => {
      void result.refetch();
    },
  };
}
