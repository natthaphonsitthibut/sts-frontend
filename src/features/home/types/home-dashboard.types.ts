export type HomeDashboardPeriod = "7_DAYS" | "30_DAYS" | "CURRENT_TERM";
export type HomeDashboardSection =
  | "attention"
  | "attendanceTrend"
  | "riskDistribution"
  | "riskAreaRanking"
  | "casePipeline"
  | "caseMovement"
  | "recentWork";

export interface HomeDashboardFilters {
  period: HomeDashboardPeriod;
  province?: string;
  district?: string;
  subDistrict?: string;
  schoolId?: number;
  grade?: string;
  room?: string;
}

export interface HomeDashboardMetric {
  key: string;
  label: string;
  value: number;
  comparison?: {
    value: string;
    description: string;
    tone: "default" | "success" | "warning" | "danger" | "info";
  };
  targetPath: string;
  targetQuery?: Record<string, string | number>;
  tone: "default" | "success" | "warning" | "danger" | "info";
}

export interface HomeDashboardAttentionItem {
  id: string;
  kind: "ATTENDANCE_INCOMPLETE" | "RISK_HIGH" | "CASE_OVERDUE" | "CASE_PENDING_REVIEW";
  label: string;
  reason: string;
  count: number;
  ageLabel: string | null;
  targetPath: string;
  targetQuery?: Record<string, string | number>;
  priority: number;
}

export interface HomeDashboardSummaryData {
  generatedAt: string;
  scopeLabel: string;
  period: HomeDashboardPeriod;
  availableSections: HomeDashboardSection[];
  metrics: HomeDashboardMetric[];
  attentionSummary: {
    total: number;
    critical: number;
    warning: number;
  };
  attentionItems: HomeDashboardAttentionItem[];
  riskAreaRanking?: HomeDashboardRiskAreaRanking;
  casePipeline?: HomeDashboardCasePipeline | null;
}

export type HomeDashboardRiskAreaDimension =
  | "PROVINCE"
  | "DISTRICT"
  | "SUB_DISTRICT"
  | "SCHOOL";

export interface HomeDashboardRiskAreaPoint {
  key: string;
  label: string;
  count: number;
  targetFilter: {
    province?: string;
    district?: string;
    subDistrict?: string;
    schoolId?: number;
  };
}

export interface HomeDashboardRiskAreaRanking {
  dimension: HomeDashboardRiskAreaDimension;
  dimensionLabel: string;
  items: HomeDashboardRiskAreaPoint[];
}

export interface HomeDashboardTrendPoint {
  key: string;
  label: string;
  present: number;
  absent: number;
  late: number;
  total: number;
  attendanceRate: number | null;
}

export interface HomeDashboardRiskDistribution {
  HIGH: number;
  MEDIUM: number;
  LOW: number;
  WATCH: number;
  NORMAL: number;
}

export interface HomeDashboardCasePipeline {
  OPEN: number;
  IN_PROGRESS: number;
  PENDING_REVIEW: number;
  RESOLVED: number;
}

export interface HomeDashboardCaseMovementPoint {
  key: string;
  label: string;
  opened: number;
  resolved: number;
}

export interface HomeDashboardTrendsData {
  generatedAt: string;
  scopeLabel: string;
  period: HomeDashboardPeriod;
  availableSections: HomeDashboardSection[];
  attendanceTrend: HomeDashboardTrendPoint[] | null;
  riskDistribution: {
    asOf: string;
    thresholds: Record<string, number>;
    summary: HomeDashboardRiskDistribution;
  } | null;
  casePipeline: HomeDashboardCasePipeline | null;
  caseMovement: HomeDashboardCaseMovementPoint[] | null;
}

export interface HomeDashboardOption {
  value: string | number;
  label: string;
}

export interface HomeDashboardFilterOptionsData {
  generatedAt: string;
  scopeLabel: string;
  options: {
    provinces: HomeDashboardOption[];
    districts: HomeDashboardOption[];
    subDistricts: HomeDashboardOption[];
    schools: HomeDashboardOption[];
    grades: HomeDashboardOption[];
    rooms: HomeDashboardOption[];
  };
}

export interface HomeDashboardResponse<T> {
  success?: boolean;
  data?: T;
}
