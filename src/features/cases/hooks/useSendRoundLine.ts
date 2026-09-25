import { useMutation } from "@tanstack/react-query";
import { casesService } from "../api/cases.service";
import type { SendRoundLineResponse } from "../types/cases.types";

/**
 * ส่งลิงก์ผ่าน LINE for one assignment round. The caller refetches the case
 * for the new delivery state; the toast says whether it went through.
 */
export function useSendRoundLine() {
  return useMutation<
    SendRoundLineResponse,
    Error,
    { caseId: number; taskId: string }
  >({
    mutationFn: ({ caseId, taskId }) =>
      casesService.sendRoundLine(caseId, taskId),
    meta: { suppressSuccessToast: true },
  });
}
