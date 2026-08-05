import { useQuery } from "@tanstack/react-query";
import { casesService } from "../api/cases.service";

export const CASE_DETAIL_QUERY_KEY = "case-detail";

export function useCaseDetail(caseId: number | undefined) {
  return useQuery({
    queryKey: [CASE_DETAIL_QUERY_KEY, caseId],
    queryFn: () => casesService.getCase(caseId as number),
    enabled: typeof caseId === "number" && Number.isInteger(caseId) && caseId > 0,
  });
}
