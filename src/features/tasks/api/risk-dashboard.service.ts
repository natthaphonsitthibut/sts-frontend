import { apiClient } from "../../../lib/api-client";
import {
  normalizePaginatedResponse,
  toPaginationParams,
} from "../../../lib/pagination";
import type {
  RiskDashboardQuery,
  RiskDashboardResult,
  RiskDashboardRow,
} from "../types/risk-dashboard.types";
import type {
  FollowUpSummary,
  ReferralDrilldownResult,
  ReferralDrilldownRow,
} from "../types/follow-up-dashboard.types";

async function getRiskDashboard(
  query: RiskDashboardQuery = {},
): Promise<RiskDashboardResult> {
  const params: Record<string, string> = toPaginationParams(query);
  if (query.studentGroup) {
    params.studentGroup = query.studentGroup;
  }
  if (query.riskTier && query.riskTier !== "ALL") {
    params.riskTier = query.riskTier;
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
  if (query.academicYear) {
    params.academicYear = String(query.academicYear);
  }
  if (query.semester) {
    params.semester = String(query.semester);
  }
  if (query.concernLevel) {
    params.concernLevel = query.concernLevel;
  }
  if (query.caseStatus) {
    params.caseStatus = query.caseStatus;
  }
  if (query.grade?.trim() && query.grade !== "ALL") {
    params.grade = query.grade.trim();
  }
  if (query.room?.trim() && query.room !== "ALL") {
    params.room = query.room.trim();
  }
  if (query.searchTerm?.trim()) {
    params.searchTerm = query.searchTerm.trim();
  }
  if (query.sortBy) {
    params.sortBy = query.sortBy;
  }
  if (query.sortDirection) {
    params.sortDirection = query.sortDirection;
  }

  const response = await apiClient.get("/dashboard/risk-watchlist", { params });
  return normalizePaginatedResponse<RiskDashboardRow>(
    response.data,
    query,
  ) as RiskDashboardResult;
}

async function getFollowUpSummary(): Promise<FollowUpSummary> {
  const response = await apiClient.get<{ data: FollowUpSummary }>(
    "/dashboard/follow-up-summary",
  );
  return response.data.data;
}

async function getReferralDrilldown(
  page = 1,
  limit = 20,
  filters: { statusCode?: string; searchTerm?: string } = {},
): Promise<ReferralDrilldownResult> {
  const response = await apiClient.get("/dashboard/referrals", {
    params: {
      page,
      limit,
      statusCode: filters.statusCode || undefined,
      searchTerm: filters.searchTerm || undefined,
    },
  });
  return normalizePaginatedResponse<ReferralDrilldownRow>(response.data, {
    page,
    limit,
  }) as ReferralDrilldownResult;
}

export const riskDashboardService = {
  getFollowUpSummary,
  getReferralDrilldown,
  getRiskDashboard,
};
