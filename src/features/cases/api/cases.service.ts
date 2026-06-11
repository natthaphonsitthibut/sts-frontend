import { apiClient } from "../../../lib/api-client";
import type {
  CaseRecord,
  CaseReviewPayload,
  CaseReviewResponse,
} from "../types/cases.types";

interface CasesService {
  getCases: () => Promise<CaseRecord[]>;
  /**
   * The backend has no raw "set status" endpoint — a case's status is driven
   * server-side by a review action (ASSIST / FORWARD / CLOSE) plus an optional
   * note, via POST /api/cases/:id/review.
   */
  reviewCase: (
    caseId: number,
    payload: CaseReviewPayload,
  ) => Promise<CaseReviewResponse>;
}

async function getCases(): Promise<CaseRecord[]> {
  const response = await apiClient.get<CaseRecord[]>("/api/cases");
  return Array.isArray(response.data) ? response.data : [];
}

async function reviewCase(
  caseId: number,
  payload: CaseReviewPayload,
): Promise<CaseReviewResponse> {
  const response = await apiClient.post<CaseReviewResponse>(
    `/api/cases/${caseId}/review`,
    payload,
  );
  return response.data;
}

export const casesService: CasesService = {
  getCases,
  reviewCase,
};
