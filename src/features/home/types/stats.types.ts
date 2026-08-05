export interface OverviewCaseTrackingStats {
  waiting: number;
  inProgress: number;
  resolved: number;
}

export interface OverviewStatsData {
  totalStudents: number;
  activeCases: number;
  atRiskStudents: number;
  caseTrackingStats: OverviewCaseTrackingStats;
}

export interface OverviewStatsResponse {
  success?: boolean;
  data?: OverviewStatsData;
}
