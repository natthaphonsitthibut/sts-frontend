import { apiClient } from "../../../lib/api-client";
import type {
  OverviewStatsData,
  OverviewStatsResponse,
} from "../types/stats.types";

interface StatsService {
  createEmptyOverviewStats: () => OverviewStatsData;
  getOverviewStats: () => Promise<OverviewStatsData>;
}

function toNumber(value: unknown): number {
  const nextValue = Number(value);
  return Number.isFinite(nextValue) ? nextValue : 0;
}

function createEmptyOverviewStats(): OverviewStatsData {
  return {
    totalStudents: 0,
    activeCases: 0,
    atRiskStudents: 0,
    caseTrackingStats: {
      waiting: 0,
      inProgress: 0,
      resolved: 0,
    },
  };
}

async function getOverviewStats(): Promise<OverviewStatsData> {
  const response =
    await apiClient.get<OverviewStatsResponse>("/stats/overview");
  const payload = response.data?.data;

  if (!payload) {
    return createEmptyOverviewStats();
  }

  return {
    totalStudents: toNumber(payload.totalStudents),
    activeCases: toNumber(payload.activeCases),
    atRiskStudents: toNumber(payload.atRiskStudents),
    caseTrackingStats: {
      waiting: toNumber(payload.caseTrackingStats?.waiting),
      inProgress: toNumber(payload.caseTrackingStats?.inProgress),
      resolved: toNumber(payload.caseTrackingStats?.resolved),
    },
  };
}

export const statsService: StatsService = {
  createEmptyOverviewStats,
  getOverviewStats,
};
