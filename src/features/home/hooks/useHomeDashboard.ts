import { useQuery } from "@tanstack/react-query";
import { homeDashboardService } from "../api/home-dashboard.service";
import type { HomeDashboardFilters } from "../types/home-dashboard.types";

export const HOME_DASHBOARD_QUERY_KEY = ["home-dashboard"] as const;

export function useHomeDashboard(filters: HomeDashboardFilters) {
  const summaryQuery = useQuery({
    queryKey: [...HOME_DASHBOARD_QUERY_KEY, "summary", filters],
    queryFn: () => homeDashboardService.getSummary(filters),
  });

  const trendsQuery = useQuery({
    queryKey: [...HOME_DASHBOARD_QUERY_KEY, "trends", filters],
    queryFn: () => homeDashboardService.getTrends(filters),
  });

  const filterOptionsQuery = useQuery({
    queryKey: [...HOME_DASHBOARD_QUERY_KEY, "filter-options", filters],
    queryFn: () => homeDashboardService.getFilterOptions(filters),
  });

  return {
    summary: summaryQuery.data,
    trends: trendsQuery.data,
    filterOptions: filterOptionsQuery.data,
    isLoading: summaryQuery.isLoading,
    isTrendsLoading: trendsQuery.isLoading,
    isFetching: summaryQuery.isFetching || trendsQuery.isFetching || filterOptionsQuery.isFetching,
    isError: summaryQuery.isError,
    isTrendsError: trendsQuery.isError,
    isFilterOptionsError: filterOptionsQuery.isError,
    dataUpdatedAt: Math.max(
      summaryQuery.dataUpdatedAt,
      trendsQuery.dataUpdatedAt,
      filterOptionsQuery.dataUpdatedAt,
    ),
    refetch: () => {
      void summaryQuery.refetch();
      void trendsQuery.refetch();
      void filterOptionsQuery.refetch();
    },
    refetchTrends: () => trendsQuery.refetch(),
    refetchFilterOptions: () => filterOptionsQuery.refetch(),
  };
}
