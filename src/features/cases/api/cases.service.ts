import { apiClient } from "../../../lib/api-client";
import {
  normalizePaginatedResponse,
  toPaginationParams,
  type PaginatedResult,
} from "../../../lib/pagination";
import type {
  CaseListQuery,
  CaseRecord,
  CaseReviewPayload,
  CaseReviewResponse,
  CaseStats,
} from "../types/cases.types";

interface CasesService {
  getCases: (query?: CaseListQuery) => Promise<PaginatedResult<CaseRecord>>;
  getCaseStats: () => Promise<CaseStats>;
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

async function getCases(
  query: CaseListQuery = {},
): Promise<PaginatedResult<CaseRecord>> {
  const params: Record<string, string> = toPaginationParams(query);
  if (query.status && query.status !== "ALL") {
    params.status = query.status;
  }
  const searchTerm = query.searchTerm?.trim();
  if (searchTerm) {
    params.searchTerm = searchTerm;
  }

  const response = await apiClient.get("/api/cases", { params });
  return normalizePaginatedResponse<CaseRecord>(response.data, query);
}

async function getCaseStats(): Promise<CaseStats> {
  const response = await apiClient.get<CaseStats>("/api/stats");
  return response.data;
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
  getCaseStats,
  reviewCase,
};
