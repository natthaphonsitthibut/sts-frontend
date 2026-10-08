import { useMutation } from "@tanstack/react-query";
import { casesService } from "../api/cases.service";
import type {
  SendReferralPayload,
  SendReferralResponse,
} from "../types/cases.types";

/** ส่งต่อ: the caller shows the one-time code, then refetches the case. */
export function useSendReferral() {
  return useMutation<
    SendReferralResponse,
    Error,
    { caseId: number; payload: SendReferralPayload }
  >({
    mutationFn: ({ caseId, payload }) =>
      casesService.sendReferral(caseId, payload),
    meta: { successMessage: "ส่งต่อหน่วยงานแล้ว" },
  });
}

/** ยกเลิกการส่งต่อ, with its reason, like ยกเลิกการมอบหมาย. */
export function useCancelReferral() {
  return useMutation<
    void,
    Error,
    { caseId: number; referralId: string; cancelReason: string }
  >({
    mutationFn: ({ caseId, referralId, cancelReason }) =>
      casesService.cancelReferral(caseId, referralId, cancelReason),
    meta: { suppressSuccessToast: true },
  });
}
