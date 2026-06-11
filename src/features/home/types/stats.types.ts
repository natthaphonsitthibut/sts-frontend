export interface OverviewHelpStats {
  waiting: number;
  inProgress: number;
  resolved: number;
}

export interface OverviewStatsData {
  totalStudents: number;
  dropoutStudents: number;
  atRiskStudents: number;
  helpStats: OverviewHelpStats;
}

export interface OverviewStatsResponse {
  success?: boolean;
  data?: OverviewStatsData;
}
