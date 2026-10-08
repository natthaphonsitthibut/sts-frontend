import { useMutation } from "@tanstack/react-query";
import { casesService } from "../api/cases.service";
import type {
  RecordReferralResultPayload,
  RecordReferralResultResponse,
} from "../types/cases.types";

interface RecordReferralResultVariables {
  caseId: number;
  referralId: string;
  payload: RecordReferralResultPayload;
}

/**
 * Records what the agency reported for one referral. The case moves on the
 * server (closed, or back to รอพิจารณา), so the caller refetches the case.
 */
export function useRecordReferralResult() {
  return useMutation<
    RecordReferralResultResponse,
    Error,
    RecordReferralResultVariables
  >({
    mutationFn: ({ caseId, referralId, payload }) =>
      casesService.recordReferralResult(caseId, referralId, payload),
    meta: { successMessage: "บันทึกผลการส่งต่อแล้ว" },
  });
}
