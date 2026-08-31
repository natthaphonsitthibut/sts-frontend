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
  kind: "RISK_HIGH" | "CASE_OVERDUE" | "CASE_PENDING_REVIEW";
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
  monthlySuccessRates?: HomeDashboardMonthlySuccessRate[];
}

export type HomeDashboardRiskAreaDimension =
  | "PROVINCE"
  | "DISTRICT"
  | "SUB_DISTRICT"
  | "SCHOOL"
  | "GRADE"
  | "ROOM";

export interface HomeDashboardRiskAreaPoint {
  key: string;
  label: string;
  count: number;
  areaCode: string | null;
  targetFilter: {
    province?: string;
    district?: string;
    subDistrict?: string;
    schoolId?: number;
    grade?: string;
    room?: string;
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
  gradeRiskDistribution: HomeDashboardGradeRiskPoint[] | null;
}

export interface HomeDashboardGradeRiskPoint {
  key: string;
  label: string;
  HIGH: number;
  WATCH: number;
  NORMAL: number;
  total: number;
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

export interface HomeDashboardMonthlySuccessRate {
  month: string;
  opened: number;
  resolved: number;
}

export interface HomeDashboardLabelCount {
  key: string;
  label: string;
  count: number;
}

/**
 * `atRiskStudents` คือสถานะ ณ ตอนนี้ (HIGH/WATCH) เด็กที่ปิดเคสแล้วและระดับความเสี่ยง
 * กลับมาปกติจะหลุดออกจากตัวเลขนี้ ส่วน `recordedStudents` คือประชากรที่กราฟด้านล่าง
 * อธิบายจริง ๆ — ทุกคนที่มีผลการติดตามในขอบเขตนี้ ไม่ว่าตอนนี้จะยังเสี่ยงอยู่หรือไม่
 */
export interface HomeDashboardFollowUpCoverage {
  atRiskStudents: number;
  followedUpStudents: number;
  pendingStudents: number;
  recordedStudents: number;
}

export interface HomeDashboardProblemCategoryPoint {
  key: string;
  label: string;
  followUp: number;
  observation: number;
  total: number;
}

export interface HomeDashboardProblemOutcomeRow {
  key: string;
  label: string;
  total: number;
  outcomes: HomeDashboardLabelCount[];
}

export interface HomeDashboardProblemAreaRow {
  key: string;
  label: string;
  total: number;
  counts: Record<string, number>;
}

export interface HomeDashboardProblemAreaMatrix {
  dimension: HomeDashboardRiskAreaDimension;
  dimensionLabel: string;
  categories: Array<{ key: string; label: string }>;
  rows: HomeDashboardProblemAreaRow[];
}

export interface HomeDashboardReferralFunnel {
  referred: number;
  accepted: number;
  pending: number;
  byAgency: HomeDashboardLabelCount[];
}

export interface HomeDashboardFollowUpInsightsData {
  generatedAt: string;
  scopeLabel: string;
  coverage: HomeDashboardFollowUpCoverage;
  problemCategories: HomeDashboardProblemCategoryPoint[];
  otherProblemDetails: string[];
  absenceReasonCategories: HomeDashboardLabelCount[];
  concernLevels: HomeDashboardLabelCount[];
  problemByOutcome: HomeDashboardProblemOutcomeRow[];
  problemByArea: HomeDashboardProblemAreaMatrix | null;
  unreachableReasons: HomeDashboardLabelCount[];
  referralFunnel: HomeDashboardReferralFunnel;
}

export interface HomeDashboardResponse<T> {
  success?: boolean;
  data?: T;
}
