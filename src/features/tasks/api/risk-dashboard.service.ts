import { apiClient } from "../../../lib/api-client";
import { normalizePaginatedResponse, toPaginationParams } from "../../../lib/pagination";
import type {
  RiskDashboardQuery,
  RiskDashboardResult,
  RiskDashboardRow,
} from "../types/risk-dashboard.types";

async function getRiskDashboard(query: RiskDashboardQuery = {}): Promise<RiskDashboardResult> {
  const params: Record<string, string> = toPaginationParams(query);
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
  return normalizePaginatedResponse<RiskDashboardRow>(response.data, query) as RiskDashboardResult;
}

export const riskDashboardService = {
  getRiskDashboard,
};
