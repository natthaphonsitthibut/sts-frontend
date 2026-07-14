import { apiClient } from "../../../lib/api-client";
import {
  normalizePaginatedResponse,
  toPaginationParams,
  type PaginatedResult,
} from "../../../lib/pagination";
import type {
  CaseListQuery,
  CasePaginationMeta,
  CaseRecord,
  CaseReportUpPayload,
  CaseReportUpResponse,
  CaseReviewPayload,
  CaseReviewResponse,
  CaseStats,
} from "../types/cases.types";

interface CasesService {
  getCases: (query?: CaseListQuery) => Promise<PaginatedResult<CaseRecord> & { meta: CasePaginationMeta }>;
  getCaseStats: () => Promise<CaseStats>;
  /**
   * The backend has no raw "set status" endpoint — a case's status is driven
   * server-side by a review action (ASSIST / FORWARD / CLOSE) plus an optional
   * note, via POST /cases/:id/review through apiClient.
   */
  reviewCase: (
    caseId: number,
    payload: CaseReviewPayload,
  ) => Promise<CaseReviewResponse>;
  reportUpCase: (caseId: number, payload: CaseReportUpPayload) => Promise<CaseReportUpResponse>;
}

async function getCases(
  query: CaseListQuery = {},
): Promise<PaginatedResult<CaseRecord> & { meta: CasePaginationMeta }> {
  const params: Record<string, string> = toPaginationParams(query);
  if (query.status && query.status !== "ALL") {
    params.status = query.status;
  }
  if (query.province?.trim()) {
    params.province = query.province.trim();
  }
  if (query.district?.trim()) {
    params.district = query.district.trim();
  }
  if (query.subDistrict?.trim()) {
    params.subDistrict = query.subDistrict.trim();
  }
  if (query.schoolId?.trim()) {
    params.schoolId = query.schoolId.trim();
  }
  if (query.grade?.trim()) {
    params.grade = query.grade.trim();
  }
  if (query.room?.trim()) {
    params.room = query.room.trim();
  }
  const searchTerm = query.searchTerm?.trim();
  if (searchTerm) {
    params.searchTerm = searchTerm;
  }

  const response = await apiClient.get("/cases", { params });
  return normalizePaginatedResponse<CaseRecord>(response.data, query) as
    PaginatedResult<CaseRecord> & { meta: CasePaginationMeta };
}

async function getCaseStats(): Promise<CaseStats> {
  const response = await apiClient.get<CaseStats>("/stats");
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

async function reportUpCase(
  caseId: number,
  payload: CaseReportUpPayload,
): Promise<CaseReportUpResponse> {
  const response = await apiClient.post<CaseReportUpResponse>(
    `/cases/${caseId}/report-up`,
    payload,
  );
  return response.data;
}

export const casesService: CasesService = {
  getCases,
  getCaseStats,
  reviewCase,
  reportUpCase,
};
