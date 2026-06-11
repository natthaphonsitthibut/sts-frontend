import { useQuery } from "@tanstack/react-query";
import { statsService } from "../api/stats.service";
import type { OverviewStatsData } from "../types/stats.types";

export const OVERVIEW_STATS_QUERY_KEY = ["stats", "overview"] as const;

const EMPTY_OVERVIEW_STATS = statsService.createEmptyOverviewStats();

interface UseOverviewStatsResult {
  overviewData: OverviewStatsData;
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
}

export function useOverviewStats(): UseOverviewStatsResult {
  const query = useQuery({
    queryKey: OVERVIEW_STATS_QUERY_KEY,
    queryFn: statsService.getOverviewStats,
  });

  return {
    overviewData: query.data ?? EMPTY_OVERVIEW_STATS,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: () => {
      void query.refetch();
    },
  };
}
