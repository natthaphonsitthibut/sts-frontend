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

async function updateCaseReferralOutcome(
  caseId: number,
  referralId: string,
  payload: CaseReferralOutcomePayload,
): Promise<CaseReferralOutcomeResponse> {
  const response = await apiClient.patch<CaseReferralOutcomeResponse>(
    `/cases/${caseId}/referrals/${referralId}`,
    payload,
  );
  return response.data;
}

async function getReferralAgencies(caseId: number): Promise<ReferralAgency[]> {
  const response = await apiClient.get<ReferralAgency[] | DataEnvelope<ReferralAgency[]>>(
    `/cases/${caseId}/referral-agencies`,
  );
  return unwrapData(response.data) || [];
}

async function getCaseReferrals(caseId: number): Promise<CaseReferralRecord[]> {
  const response = await apiClient.get<CaseReferralRecord[] | DataEnvelope<CaseReferralRecord[]>>(
    `/cases/${caseId}/referrals`,
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
