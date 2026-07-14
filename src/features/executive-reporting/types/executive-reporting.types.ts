export type ExecutiveReportingGroup = "PROVINCE" | "DISTRICT" | "SCHOOL";

export interface ExecutiveReportingFilters {
  groupBy: ExecutiveReportingGroup;
  province?: string;
  district?: string;
  schoolId?: number;
  from?: string;
  to?: string;
}

export interface SuppressedCount {
  value: number | null;
  suppressed: boolean;
}

export interface ExecutiveRiskMetrics {
  high: SuppressedCount;
  medium: SuppressedCount;
  low: SuppressedCount;
  watch: SuppressedCount;
  normal: SuppressedCount;
  missingProfile: SuppressedCount;
  humanConcernStudentsInPeriod: SuppressedCount;
}

export interface ExecutiveCaseMetrics {
  createdInPeriod: SuppressedCount;
  unresolved: SuppressedCount;
  resolvedInPeriod: SuppressedCount;
  reportedUp: SuppressedCount;
}

export interface ExecutiveDataFreshness {
  enrollmentAcademicYear: number | null;
  enrollmentSemester: number | null;
  riskProfileCalculatedAt: string | null;
  humanObservationAt: string | null;
  caseUpdatedAt: string | null;
}

export interface ExecutiveReportingArea {
  level: ExecutiveReportingGroup;
  province: string | null;
  district: string | null;
  schoolId: number | null;
  schoolName: string | null;
  activeStudents: SuppressedCount;
  risk: ExecutiveRiskMetrics;
  cases: ExecutiveCaseMetrics;
  freshness: ExecutiveDataFreshness;
}

export interface ExecutiveReportingSummary {
  activeStudents: SuppressedCount;
  risk: ExecutiveRiskMetrics;
  cases: ExecutiveCaseMetrics;
  freshness: ExecutiveDataFreshness;
}

export interface ExecutiveReportingOverview {
  groupBy: ExecutiveReportingGroup;
  period: { from: string | null; to: string | null };
  suppression: {
    minimumCellSize: number;
    rule: "NON_ZERO_BELOW_MINIMUM";
  };
  summary: ExecutiveReportingSummary;
  areas: ExecutiveReportingArea[];
}

export interface ExecutiveReportingOption {
  label: string;
  value: string;
}
