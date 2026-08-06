import type { PaginationMeta } from "../../../lib/pagination";

export type KnownCaseStatus =
  | "OPEN"
  | "PENDING_REVIEW"
  | "IN_PROGRESS"
  | "STUDENT_NOT_FOUND"
  | "RESOLVED";

export type CaseStatus = KnownCaseStatus | (string & {});

export type CaseBadgeVariant =
  | "default"
  | "secondary"
  | "destructive"
  | "success"
  | "warning";

export type CaseSummaryTone = "default" | "success" | "warning" | "danger" | "info";

export type CaseReviewAction = "REFER_AGENCY" | "CLOSE";
export type CaseResolutionOutcome = string;

export interface CaseTrackingOption {
  code: string;
  label: string;
  targetStatus: string | null;
  requiresResolutionOutcome: boolean;
  requiredPermission?: string;
}

export interface CaseTrackingOptions {
  reviewActions: CaseTrackingOption[];
  followUpDecisions: CaseTrackingOption[];
  resolutionOutcomes: Array<{ code: string; label: string }>;
  homeVisitExceptions: Array<{
    code: string;
    label: string;
    requiresUpdatedAddress: boolean;
  }>;
  homeVisitAssessments: Array<{ code: string; label: string }>;
}

export interface CaseFollowUpRound {
  task_id: string;
  task_status: string;
  created_at: string;
  initial_assignee?: string | null;
  link_count: number;
  submitted_at?: string | null;
  visited_at?: string | null;
  cause_category?: string | null;
  follow_up_assessment_code?: string | null;
  follow_up_assessment_label?: string | null;
  cause_detail?: string | null;
  recommendation?: string | null;
  visit_lat?: number | null;
  visit_lng?: number | null;
  photo_paths?: string | null;
  address_changed?: boolean;
  home_visit_exception_code?: string | null;
  updated_student_address?: string | null;
  updated_address_line?: string | null;
  updated_address_province?: string | null;
  updated_address_district?: string | null;
  updated_address_sub_district?: string | null;
  updated_postal_code?: string | null;
  updated_lat?: number | null;
  updated_lng?: number | null;
  follow_up_decision?: string | null;
  resolution_outcome?: string | null;
}

export interface CaseRiskSignal {
  id: string;
  source_code: string;
  rule_code?: string | null;
  reason: string;
  detected_at: string;
}

export interface CaseRecord {
  id: number;
  student_id?: string | null;
  task_id?: string | null;
  student_name: string;
  student_photo_url?: string | null;
  student_school?: string | null;
  student_address?: string | null;
  reason?: string | null;
  reason_flagged?: string | null;
  status: CaseStatus;
  status_label?: string | null;
  completion_outcome_code?: "CLOSED" | "REFERRED_AGENCY" | null;
  completion_outcome_label?: string | null;
  display_status_label?: string | null;
  status_badge_variant?: CaseBadgeVariant | null;
  status_summary_tone?: CaseSummaryTone | null;
  created_at: string;
  active_link_id?: string | null;
  active_link_created_at?: string | null;
  active_link_expires_at?: string | null;
  active_link_assigned_to?: string | null;
  latest_link_id?: string | null;
  latest_link_status?: string | null;
  latest_link_assigned_to?: string | null;
  link_state?: "ACTIVE" | "LOCKED" | "EXPIRED" | "NONE" | null;
  school_id?: number | null;
  grade?: string | null;
  room?: string | null;
  updated_at?: string | null;
  follow_up_rounds?: CaseFollowUpRound[];
  reviews?: CaseReviewRecord[];
  risk_signals?: CaseRiskSignal[];
}

export interface OpenCasePayload {
  student_id: string;
  reason: string;
}

export interface CaseDetailResponse {
  success: boolean;
  data: CaseRecord;
}

export interface OpenCaseResponse extends CaseDetailResponse {
  created: boolean;
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
  reviewed_by: string | null;
  reviewed_at: string;
  review_note: string | null;
  review_summary?: string | null;
}

export interface CaseReviewPayload {
  review_action: CaseReviewAction;
  review_note: string;
  resolution_outcome?: CaseResolutionOutcome | null;
}

export interface CaseReviewResponse {
  success?: boolean;
  message?: string;
  case?: Record<string, unknown> | null;
  review?: CaseReviewRecord | null;
}
