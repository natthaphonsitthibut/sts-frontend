import { useMutation } from "@tanstack/react-query";
import { casesService } from "../api/cases.service";
import type {
  CaseReviewPayload,
  CaseReviewResponse,
} from "../types/cases.types";

interface UpdateCaseVariables {
  caseId: number;
  payload: CaseReviewPayload;
}

/**
 * Updates a case through the configured review actions.
 */
export function useUpdateCase() {
  return useMutation<CaseReviewResponse, Error, UpdateCaseVariables>({
    mutationFn: ({ caseId, payload }) =>
      casesService.reviewCase(caseId, payload),
  });
}
