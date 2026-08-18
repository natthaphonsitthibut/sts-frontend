import { apiClient } from "../../../lib/api-client";
import type {
  CancelCaseAssignmentPayload,
  CancelCaseAssignmentResponse,
  CaseDetailResponse,
  CaseTrackingOptions,
  CaseReviewPayload,
  CaseReviewResponse,
  OpenCasePayload,
  OpenCaseResponse,
} from "../types/cases.types";

interface CasesService {
  getCase: (caseId: number) => Promise<CaseDetailResponse>;
  openCase: (payload: OpenCasePayload) => Promise<OpenCaseResponse>;
  /**
   * The backend has no raw "set status" endpoint — a case's status is driven
   * server-side by a review action plus an optional
   * note, via POST /cases/:id/review through apiClient.
   */
  reviewCase: (
    caseId: number,
    payload: CaseReviewPayload,
  ) => Promise<CaseReviewResponse>;
  getTrackingOptions: () => Promise<CaseTrackingOptions>;
  /** Withdraws the assignment the case is waiting on; the case returns to รอมอบหมาย. */
  cancelAssignment: (
    caseId: number,
    payload: CancelCaseAssignmentPayload,
  ) => Promise<CancelCaseAssignmentResponse>;
}

async function getCase(caseId: number): Promise<CaseDetailResponse> {
  const response = await apiClient.get<CaseDetailResponse>(`/cases/${caseId}`);
  return response.data;
}

async function openCase(payload: OpenCasePayload): Promise<OpenCaseResponse> {
  const response = await apiClient.post<OpenCaseResponse>("/cases", payload);
  return response.data;
}

async function reviewCase(
  caseId: number,
  payload: CaseReviewPayload,
): Promise<CaseReviewResponse> {
  const response = await apiClient.post<CaseReviewResponse>(
    `/cases/${caseId}/review`,
    payload,
  );
  return response.data;
}

async function cancelAssignment(
  caseId: number,
  payload: CancelCaseAssignmentPayload,
): Promise<CancelCaseAssignmentResponse> {
  const response = await apiClient.post<CancelCaseAssignmentResponse>(
    `/cases/${caseId}/cancel-assignment`,
    payload,
  );
  return response.data;
}

async function getTrackingOptions(): Promise<CaseTrackingOptions> {
  const response = await apiClient.get<CaseTrackingOptions>(
    "/public/case-tracking-options",
  );
  return response.data;
}

export const casesService: CasesService = {
  getCase,
  openCase,
  reviewCase,
  getTrackingOptions,
  cancelAssignment,
};
