import { useMutation, useQueryClient } from "@tanstack/react-query";
import { casesService } from "../api/cases.service";
import type { CaseReportUpPayload, CaseReportUpResponse } from "../types/cases.types";
import { CASES_QUERY_KEY } from "./useCases";

interface ReportUpCaseVariables {
  caseId: number;
  payload: CaseReportUpPayload;
}

export function useReportUpCase() {
  const queryClient = useQueryClient();
  return useMutation<CaseReportUpResponse, Error, ReportUpCaseVariables>({
    mutationFn: ({ caseId, payload }) => casesService.reportUpCase(caseId, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: [CASES_QUERY_KEY] });
      await queryClient.invalidateQueries({ queryKey: ["case-report-ups"] });
    },
  });
}
