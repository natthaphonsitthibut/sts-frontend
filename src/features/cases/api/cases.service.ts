import { apiClient } from "../../../lib/api-client";
import {
  normalizePaginatedResponse,
  toPaginationParams,
  type PaginatedResult,
} from "../../../lib/pagination";
import type {
  CaseListQuery,
  CaseRecord,
  CaseReferralOutcomePayload,
  CaseReferralOutcomeResponse,
  CaseReviewPayload,
  CaseReviewResponse,
  CaseReferralRecord,
  CaseStats,
  ReferralAgency,
} from "../types/cases.types";

interface DataEnvelope<T> {
  data?: T;
}

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
  updateCaseReferralOutcome: (
    caseId: number,
    referralId: string,
    payload: CaseReferralOutcomePayload,
  ) => Promise<CaseReferralOutcomeResponse>;
  getReferralAgencies: (caseId: number) => Promise<ReferralAgency[]>;
  getCaseReferrals: (caseId: number) => Promise<CaseReferralRecord[]>;
}

function unwrapData<T>(data: T | DataEnvelope<T>): T {
  if (data && typeof data === "object" && "data" in data) {
    return (data as DataEnvelope<T>).data as T;
  }
  return data as T;
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

async function updateCaseReferralOutcome(
  caseId: number,
  referralId: string,
  payload: CaseReferralOutcomePayload,
): Promise<CaseReferralOutcomeResponse> {
  const response = await apiClient.patch<CaseReferralOutcomeResponse>(
    `/api/cases/${caseId}/referrals/${referralId}`,
    payload,
  );
  return response.data;
}

async function getReferralAgencies(caseId: number): Promise<ReferralAgency[]> {
  const response = await apiClient.get<ReferralAgency[] | DataEnvelope<ReferralAgency[]>>(
    `/api/cases/${caseId}/referral-agencies`,
  );
  return unwrapData(response.data) || [];
}

async function getCaseReferrals(caseId: number): Promise<CaseReferralRecord[]> {
  const response = await apiClient.get<CaseReferralRecord[] | DataEnvelope<CaseReferralRecord[]>>(
    `/api/cases/${caseId}/referrals`,
  );
  return unwrapData(response.data) || [];
}

export const casesService: CasesService = {
  getCases,
  getCaseStats,
  reviewCase,
  updateCaseReferralOutcome,
  getReferralAgencies,
  getCaseReferrals,
};
