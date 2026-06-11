import { useMutation, useQueryClient } from "@tanstack/react-query";
import { casesService } from "../api/cases.service";
import type {
  CaseReviewPayload,
  CaseReviewResponse,
} from "../types/cases.types";
import { CASES_QUERY_KEY } from "./useCases";

interface UpdateCaseVariables {
  caseId: number;
  payload: CaseReviewPayload;
}

/**
 * Updates a case's status by submitting a review action (ASSIST / FORWARD /
 * CLOSE) plus an optional note. The resulting status is resolved server-side.
 */
export function useUpdateCase() {
  const queryClient = useQueryClient();

  return useMutation<CaseReviewResponse, Error, UpdateCaseVariables>({
    mutationFn: ({ caseId, payload }) =>
      casesService.reviewCase(caseId, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [CASES_QUERY_KEY] });
    },
  });
}
