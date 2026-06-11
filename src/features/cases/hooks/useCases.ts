import { useQuery } from "@tanstack/react-query";
import { casesService } from "../api/cases.service";
import type { CaseRecord } from "../types/cases.types";

export const CASES_QUERY_KEY = "cases";

const EMPTY_CASES: CaseRecord[] = [];

interface UseCasesResult {
  cases: CaseRecord[];
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
}

export function useCases(): UseCasesResult {
  const result = useQuery({
    queryKey: [CASES_QUERY_KEY],
    queryFn: casesService.getCases,
  });

  return {
    cases: result.data ?? EMPTY_CASES,
    isLoading: result.isLoading,
    isError: result.isError,
    refetch: () => {
      void result.refetch();
    },
  };
}
