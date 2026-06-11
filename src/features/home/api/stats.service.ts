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
    dropoutStudents: 0,
    atRiskStudents: 0,
    helpStats: {
      waiting: 0,
      inProgress: 0,
      resolved: 0,
    },
  };
}

async function getOverviewStats(): Promise<OverviewStatsData> {
  const response =
    await apiClient.get<OverviewStatsResponse>("/api/stats/overview");
  const payload = response.data?.data;

  if (!payload) {
    return createEmptyOverviewStats();
  }

  return {
    totalStudents: toNumber(payload.totalStudents),
    dropoutStudents: toNumber(payload.dropoutStudents),
    atRiskStudents: toNumber(payload.atRiskStudents),
    helpStats: {
      waiting: toNumber(payload.helpStats?.waiting),
      inProgress: toNumber(payload.helpStats?.inProgress),
      resolved: toNumber(payload.helpStats?.resolved),
    },
  };
}

export const statsService: StatsService = {
  createEmptyOverviewStats,
  getOverviewStats,
};
