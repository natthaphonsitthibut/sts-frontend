import { useMutation } from "@tanstack/react-query";
import { casesService } from "../api/cases.service";
import type {
  CaseReferralOutcomePayload,
  CaseReferralOutcomeResponse,
} from "../types/cases.types";

interface UpdateCaseReferralVariables {
  caseId: number;
  referralId: string;
  payload: CaseReferralOutcomePayload;
}

export function useUpdateCaseReferral() {
  return useMutation<CaseReferralOutcomeResponse, Error, UpdateCaseReferralVariables>({
    mutationFn: ({ caseId, referralId, payload }) =>
      casesService.updateCaseReferralOutcome(caseId, referralId, payload),
  });
}
