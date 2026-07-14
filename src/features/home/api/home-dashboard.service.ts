import { apiClient } from "../../../lib/api-client";
import type {
  HomeDashboardFilterOptionsData,
  HomeDashboardFilters,
  HomeDashboardResponse,
  HomeDashboardSummaryData,
  HomeDashboardTrendsData,
} from "../types/home-dashboard.types";

function compactParams(filters: HomeDashboardFilters): Record<string, string | number> {
  const params: Record<string, string | number> = { period: filters.period };
  if (filters.province) params.province = filters.province;
  if (filters.district) params.district = filters.district;
  if (filters.subDistrict) params.subDistrict = filters.subDistrict;
  if (filters.schoolId) params.schoolId = filters.schoolId;
  if (filters.grade) params.grade = filters.grade;
  if (filters.room) params.room = filters.room;
  return params;
}

async function unwrap<T>(promise: Promise<{ data: HomeDashboardResponse<T> }>): Promise<T> {
  const response = await promise;
  if (!response.data.data) {
    throw new Error("ไม่พบข้อมูลหน้าหลัก");
  }
  return response.data.data;
}

async function getSummary(filters: HomeDashboardFilters): Promise<HomeDashboardSummaryData> {
  return await unwrap(
    apiClient.get<HomeDashboardResponse<HomeDashboardSummaryData>>("/home-dashboard/summary", {
      params: compactParams(filters),
    }),
  );
}

async function getTrends(filters: HomeDashboardFilters): Promise<HomeDashboardTrendsData> {
  return await unwrap(
    apiClient.get<HomeDashboardResponse<HomeDashboardTrendsData>>("/home-dashboard/trends", {
      params: compactParams(filters),
    }),
  );
}

async function getFilterOptions(
  filters: HomeDashboardFilters,
): Promise<HomeDashboardFilterOptionsData> {
  return await unwrap(
    apiClient.get<HomeDashboardResponse<HomeDashboardFilterOptionsData>>(
      "/home-dashboard/filter-options",
      {
        params: compactParams(filters),
      },
    ),
  );
}

export const homeDashboardService = {
  getSummary,
  getTrends,
  getFilterOptions,
};
