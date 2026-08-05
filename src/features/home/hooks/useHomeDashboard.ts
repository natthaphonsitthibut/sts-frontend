import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { homeDashboardService } from "../api/home-dashboard.service";
import type { HomeDashboardFilters } from "../types/home-dashboard.types";

export const HOME_DASHBOARD_QUERY_KEY = ["home-dashboard"] as const;

export function useHomeDashboard(filters: HomeDashboardFilters) {
  const summaryQuery = useQuery({
    queryKey: [...HOME_DASHBOARD_QUERY_KEY, "summary", filters],
    queryFn: () => homeDashboardService.getSummary(filters),
    placeholderData: keepPreviousData,
  });

  const nationalSummaryQuery = useQuery({
    queryKey: [
      ...HOME_DASHBOARD_QUERY_KEY,
      "summary",
      { period: filters.period },
    ],
    queryFn: () => homeDashboardService.getSummary({ period: filters.period }),
    placeholderData: keepPreviousData,
  });

  const filterOptionsQuery = useQuery({
    queryKey: [...HOME_DASHBOARD_QUERY_KEY, "filter-options", filters],
    queryFn: () => homeDashboardService.getFilterOptions(filters),
    placeholderData: keepPreviousData,
  });

  return {
    summary: summaryQuery.data,
    nationalSummary: nationalSummaryQuery.data,
    filterOptions: filterOptionsQuery.data,
    isLoading: summaryQuery.isLoading,
    isFetching: summaryQuery.isFetching || filterOptionsQuery.isFetching,
    isError: summaryQuery.isError,
    isFilterOptionsError: filterOptionsQuery.isError,
    dataUpdatedAt: Math.max(
      summaryQuery.dataUpdatedAt,
      filterOptionsQuery.dataUpdatedAt,
    ),
    refetch: () => {
      void summaryQuery.refetch();
      void nationalSummaryQuery.refetch();
      void filterOptionsQuery.refetch();
    },
    refetchFilterOptions: () => filterOptionsQuery.refetch(),
  };
}
