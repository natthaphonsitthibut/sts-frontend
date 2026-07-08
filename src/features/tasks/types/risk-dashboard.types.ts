import type { PaginationMeta } from "../../../lib/pagination";

export type RiskDashboardTier = "HIGH" | "MEDIUM" | "LOW" | "WATCH" | "NORMAL";
export type RiskDashboardTierFilter = "ALL" | RiskDashboardTier;
export type RiskDashboardSortBy =
  | "risk"
  | "name"
  | "school"
  | "grade"
  | "room"
  | "attendance"
  | "openCases";
export type RiskDashboardSortDirection = "asc" | "desc";

export interface RiskDashboardRow {
  studentId: string;
  studentName: string;
  schoolId: number | null;
  schoolName: string | null;
  grade: string | null;
  room: string | null;
  consecutiveAbsentDays: number;
  absentDays: number;
  lateCount: number;
  subjectLateCount: number;
  schoolDayCount: number;
  weightedAbsenceDays: number;
  weightedAttendancePercent: number | null;
  riskTier: RiskDashboardTier;
  riskScore: number;
  openCaseCount: number;
  latestOpenCaseId: number | null;
  latestOpenCaseReason: string | null;
  latestOpenTaskId: string | null;
  latestCaseAt: string | null;
}

export interface RiskDashboardThresholds {
  lowConsecutiveAbsentDays: number;
  mediumConsecutiveAbsentDays: number;
  highConsecutiveAbsentDays: number;
  watchProgressRatio: number;
  lowAttendancePercent: number;
  mediumAttendancePercent: number;
  highAttendancePercent: number;
  lateWeight: number;
  subjectLateWindowDays: number;
  subjectLateWatchCount: number;
}

export type RiskDashboardSummary = Record<RiskDashboardTier, number>;

export interface RiskDashboardMeta extends PaginationMeta {
  summary: RiskDashboardSummary;
  thresholds: RiskDashboardThresholds;
}

export interface RiskDashboardResult {
  items: RiskDashboardRow[];
  meta: RiskDashboardMeta;
}

export interface RiskDashboardQuery {
  riskTier?: RiskDashboardTierFilter;
  province?: string;
  district?: string;
  subDistrict?: string;
  schoolId?: string;
  grade?: string;
  room?: string;
  searchTerm?: string;
  page?: number;
  limit?: number;
  sortBy?: RiskDashboardSortBy;
  sortDirection?: RiskDashboardSortDirection;
}
