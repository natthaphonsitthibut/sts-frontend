import { apiClient } from "../../../lib/api-client";
import type {
  ExecutiveReportingFilters,
  ExecutiveReportingOverview,
} from "../types/executive-reporting.types";

function compactParams(
  filters: ExecutiveReportingFilters,
): Record<string, string | number> {
  const params: Record<string, string | number> = { groupBy: filters.groupBy };
  if (filters.province) params.province = filters.province;
  if (filters.district) params.district = filters.district;
  if (filters.schoolId) params.schoolId = filters.schoolId;
  if (filters.from) params.from = filters.from;
  if (filters.to) params.to = filters.to;
  return params;
}

export async function fetchExecutiveReportingOverview(
  filters: ExecutiveReportingFilters,
): Promise<ExecutiveReportingOverview> {
  const response = await apiClient.get<ExecutiveReportingOverview>(
    "/executive-reporting/overview",
    { params: compactParams(filters) },
  );
  return response.data;
}
