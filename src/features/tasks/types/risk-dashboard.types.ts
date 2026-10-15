import type { PaginationMeta } from "../../../lib/pagination";

export type RiskDashboardTier = "HIGH" | "WATCH" | "NORMAL";
export type RiskDashboardTierFilter = "ALL" | RiskDashboardTier;
export type RiskDashboardSortBy =
  | "risk"
  | "name"
  | "school"
  | "grade"
  | "room"
  | "attendance"
  | "openCases"
  | "updatedAt"
  | "problemCategory"
  | "priority";
export type RiskDashboardSortDirection = "asc" | "desc";

export interface RiskDashboardRow {
  studentId: string;
  studentName: string;
  studentPhotoUrl: string | null;
  schoolId: number | null;
  schoolName: string | null;
  academicYear?: number | null;
  semester?: number | null;
  grade: string | null;
  room: string | null;
  consecutiveAbsentDays: number;
  /** Operational count since the most recently resolved case, if any. */
  absentDays: number;
  termAbsentDays: number;
  absenceResetAfterDate: string | null;
  lateCount: number;
  subjectLateCount: number;
  recordedDayCount: number;
  attendanceRatePercent: number | null;
  riskTier: RiskDashboardTier;
  riskScore: number;
  openCaseCount: number;
  latestOpenCaseId: number | null;
  latestOpenCaseReason: string | null;
  latestOpenTaskId: string | null;
  latestCaseId: number | null;
  latestCaseStatus: string | null;
  latestCaseAt: string | null;
  /** Newest of the latest case's update and the latest observation. */
  latestActivityAt: string | null;
  latestCaseMagicLink: string | null;
  /** True once this case has ever had a task/link assignment — distinguishes
   * a case whose link expired/was cancelled (needs reassignment) from one
   * that has simply never been assigned yet. */
  latestCaseHadAssignment: boolean;
  problemCategoryLabel: string | null;
  concernLevelCode: ConcernLevelCode | null;
  concernLevelLabel: string | null;
  /** Every observation recorded for this student, not just the one shown. */
  commentCount: number;
  /** Observations recorded after the student's last completed case. */
  pendingCommentCount: number;
  /** When the latest case was closed; observations after it start a new round. */
  lastCaseResolvedAt: string | null;
  /** When the watch was last closed without a case (ปิดการเฝ้าระวัง). */
  lastWatchClosedAt: string | null;
  /** An undecided observation from an earlier term, with no case following it. */
  pendingFromPreviousTerm: boolean;
  teacherComment: string | null;
}

export type ConcernLevelCode = "NOTE" | "WATCH" | "CONCERN";

export interface RiskDashboardThresholds {
  /** วันขาดหลังปิดเคสล่าสุด (ไม่ต้องติดกัน) ที่ถึงเกณฑ์ `เสี่ยง` */
  highAbsentDays: number;
}

export type RiskDashboardSummary = Record<RiskDashboardTier, number>;

export interface RiskDashboardMeta extends PaginationMeta {
  summary: RiskDashboardSummary;
  caseStatusSummary: Record<
    "OPEN" | "IN_PROGRESS" | "PENDING_REVIEW" | "STUDENT_NOT_FOUND",
    number
  >;
  concernLevelSummary: Record<ConcernLevelCode, number>;
  thresholds: RiskDashboardThresholds;
}

export interface RiskDashboardResult {
  items: RiskDashboardRow[];
  meta: RiskDashboardMeta;
}

export interface RiskDashboardQuery {
  studentGroup?: "RISK" | "WATCHLIST";
  /** Narrows the watchlist to one level; unset keeps the WATCH/CONCERN default. */
  concernLevel?: ConcernLevelCode;
  riskTier?: RiskDashboardTierFilter;
  province?: string;
  district?: string;
  subDistrict?: string;
  schoolId?: string;
  academicYear?: number;
  semester?: number;
  caseStatus?:
    | "OPEN"
    | "IN_PROGRESS"
    | "PENDING_REVIEW"
    | "STUDENT_NOT_FOUND"
    | "AWAITING_REFERRAL"
    | "AWAITING_REFERRAL_OUTCOME"
    | "REFERRAL_NOT_SUCCEEDED"
    | "RESOLVED"
    | "NOT_OPENED";
  grade?: string;
  room?: string;
  searchTerm?: string;
  page?: number;
  limit?: number;
  sortBy?: RiskDashboardSortBy;
  sortDirection?: RiskDashboardSortDirection;
}

export interface RiskReportFilterOptions {
  grades: Array<{ value: string; label: string }>;
  rooms: string[];
  terms: Array<{ academicYear: number; semester: number }>;
}
