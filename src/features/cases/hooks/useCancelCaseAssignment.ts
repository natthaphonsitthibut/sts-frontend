import { useMutation } from "@tanstack/react-query";
import { casesService } from "../api/cases.service";
import type {
  CancelCaseAssignmentPayload,
  CancelCaseAssignmentResponse,
} from "../types/cases.types";

interface CancelCaseAssignmentVariables {
  caseId: number;
  payload: CancelCaseAssignmentPayload;
}

/**
 * Withdraws the assignment a case is waiting on. The case drops back to
 * รอมอบหมาย and the teacher's link stops working, so the caller refetches the
 * case afterwards rather than patching state locally.
 */
export function useCancelCaseAssignment() {
  return useMutation<
    CancelCaseAssignmentResponse,
    Error,
    CancelCaseAssignmentVariables
  >({
    mutationFn: ({ caseId, payload }) =>
      casesService.cancelAssignment(caseId, payload),
    meta: { successMessage: "ยกเลิกการมอบหมายแล้ว" },
  });
}
