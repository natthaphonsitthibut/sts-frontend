import type { PaginationMeta } from "../../../lib/pagination";

export type KnownCaseStatus =
  | "OPEN"
  | "PENDING_REVIEW"
  | "IN_PROGRESS"
  | "REPORTED_UP"
  | "RESOLVED";

export type CaseStatus = KnownCaseStatus | (string & {});

export type CaseBadgeVariant =
  | "default"
  | "secondary"
  | "destructive"
  | "success"
  | "warning";

export type CaseSummaryTone = "default" | "success" | "warning" | "danger" | "info";

export type CaseReviewAction = "ASSIST" | "CLOSE";
export type CaseWorkflowAction = CaseReviewAction | "REPORT_UP";
export type CaseResolutionOutcome =
  | "RETURNED_TO_SCHOOL"
  | "TRANSFERRED_SCHOOL"
  | "ILLNESS"
  | "WORKING"
  | "UNREACHABLE"
  | "OTHER";
export interface CaseRecord {
  id: number;
  student_id?: string | null;
  task_id?: string | null;
  student_name: string;
  student_school?: string | null;
  student_address?: string | null;
  reason?: string | null;
  reason_flagged?: string | null;
  status: CaseStatus;
  status_label?: string | null;
  status_badge_variant?: CaseBadgeVariant | null;
  status_summary_tone?: CaseSummaryTone | null;
  created_at: string;
  active_link_id?: string | null;
  active_link_created_at?: string | null;
  active_link_expires_at?: string | null;
  active_link_assigned_to?: string | null;
  link_state?: "ACTIVE" | "LOCKED" | "EXPIRED" | "NONE" | null;
}

export interface CaseListQuery {
  status?: string;
  province?: string;
  district?: string;
  subDistrict?: string;
  schoolId?: string;
  grade?: string;
  room?: string;
  searchTerm?: string;
  page?: number;
  limit?: number;
}

export type CaseStatusCounts = Record<KnownCaseStatus, number>;

export interface CasePaginationMeta extends PaginationMeta {
  statusCounts?: Partial<CaseStatusCounts>;
}

/** Scope-aware case counts from `GET /stats` through apiClient. */
export interface CaseStats {
  total: number;
  atRiskStudents?: number;
  open: number;
  inProgress: number;
  reportedUp: number;
  resolved: number;
  today: number;
  pendingReview: number;
  activeLinks?: number;
  statusCounts?: Partial<Record<CaseStatus, number>>;
}

export interface CaseReviewRecord {
  id: string;
  review_action: string;
  resolution_outcome?: CaseResolutionOutcome | null;
  reviewed_by: string;
  reviewed_at: string;
  review_note: string | null;
}

export interface CaseReviewPayload {
  review_action: CaseReviewAction;
  review_note?: string | null;
  resolution_outcome?: CaseResolutionOutcome | null;
}

export interface CaseReportUpPayload {
  reason: string;
  summary: string;
}

export interface CaseReportUpRecord {
  id: string;
  case_id: number;
  school_id: number | null;
  reported_by: number | null;
  reported_by_label: string | null;
  report_reason: string | null;
  report_summary: string | null;
  school_name_snapshot: string | null;
  province_snapshot: string | null;
  district_snapshot: string | null;
  sub_district_snapshot: string | null;
  reported_at: string;
}

export interface CaseReportUpResponse {
  success: boolean;
  data: CaseReportUpRecord;
}

export interface CaseReviewResponse {
  success?: boolean;
  message?: string;
  case?: Record<string, unknown> | null;
  review?: CaseReviewRecord | null;
}
