import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { homeDashboardService } from "../api/home-dashboard.service";
import type { HomeDashboardFilters } from "../types/home-dashboard.types";

export const HOME_DASHBOARD_QUERY_KEY = ["home-dashboard"] as const;

/**
 * The four requests below land at different moments, and each one that lands
 * re-lays out the page under the charts. Remounting the dashboard — a tab out
 * and back, a navigation — used to replay all four immediately. Holding them
 * fresh for half a minute keeps the layout still, which is what the charts
 * measure themselves against.
 */
const HOME_DASHBOARD_STALE_TIME_MS = 30_000;

export function useHomeDashboard(filters: HomeDashboardFilters) {
  const summaryQuery = useQuery({
    queryKey: [...HOME_DASHBOARD_QUERY_KEY, "summary", filters],
    queryFn: () => homeDashboardService.getSummary(filters),
    placeholderData: keepPreviousData,
    staleTime: HOME_DASHBOARD_STALE_TIME_MS,
  });

  const filterOptionsQuery = useQuery({
    queryKey: [...HOME_DASHBOARD_QUERY_KEY, "filter-options", filters],
    queryFn: () => homeDashboardService.getFilterOptions(filters),
    placeholderData: keepPreviousData,
    staleTime: HOME_DASHBOARD_STALE_TIME_MS,
  });

  // Trends and follow-up insights are their own requests so the counts and the
  // ranking still paint immediately; a slow aggregate delays its own card only.
  const trendsQuery = useQuery({
    queryKey: [...HOME_DASHBOARD_QUERY_KEY, "trends", filters],
    queryFn: () => homeDashboardService.getTrends(filters),
    placeholderData: keepPreviousData,
    staleTime: HOME_DASHBOARD_STALE_TIME_MS,
  });

  const followUpInsightsQuery = useQuery({
    queryKey: [...HOME_DASHBOARD_QUERY_KEY, "follow-up-insights", filters],
    queryFn: () => homeDashboardService.getFollowUpInsights(filters),
    placeholderData: keepPreviousData,
    staleTime: HOME_DASHBOARD_STALE_TIME_MS,
  });

  return {
    summary: summaryQuery.data,
    filterOptions: filterOptionsQuery.data,
    trends: trendsQuery.data,
    followUpInsights: followUpInsightsQuery.data,
    isLoading: summaryQuery.isLoading,
    isTrendsLoading: trendsQuery.isLoading,
    isFollowUpInsightsLoading: followUpInsightsQuery.isLoading,
    isFetching:
      summaryQuery.isFetching ||
      filterOptionsQuery.isFetching ||
      trendsQuery.isFetching ||
      followUpInsightsQuery.isFetching,
    isError: summaryQuery.isError,
    isTrendsError: trendsQuery.isError,
    isFollowUpInsightsError: followUpInsightsQuery.isError,
    isFilterOptionsError: filterOptionsQuery.isError,
    dataUpdatedAt: Math.max(
      summaryQuery.dataUpdatedAt,
      filterOptionsQuery.dataUpdatedAt,
      trendsQuery.dataUpdatedAt,
      followUpInsightsQuery.dataUpdatedAt,
    ),
    refetch: () => {
      void summaryQuery.refetch();
      void filterOptionsQuery.refetch();
      void trendsQuery.refetch();
      void followUpInsightsQuery.refetch();
    },
    refetchFilterOptions: () => filterOptionsQuery.refetch(),
    refetchTrends: () => trendsQuery.refetch(),
    refetchFollowUpInsights: () => followUpInsightsQuery.refetch(),
  };
}
