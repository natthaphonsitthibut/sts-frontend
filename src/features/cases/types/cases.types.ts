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
  | "warning"
  | "purple";

export type CaseReviewAction = "REFER_AGENCY" | "CLOSE" | "ASSIST";

/** `FOLLOW_UP` = ติดตาม round, `ASSISTANCE` = ให้ความช่วยเหลือ round. */
export type CaseWorkflowPhase = "FOLLOW_UP" | "ASSISTANCE";
export type CaseResolutionOutcome = string;

export interface CaseTrackingOption {
  code: string;
  label: string;
  targetStatus: string | null;
  requiresResolutionOutcome: boolean;
  requiredPermission?: string;
  /** null = the action is offered in every phase. */
  availablePhaseCode?: string | null;
  targetWorkflowPhaseCode?: string | null;
}

export interface AssistanceMeasureOption {
  code: string;
  label: string;
  requiresDetail: boolean;
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
  followUpProblemCategories: Array<{
    code: string;
    label: string;
    guidance: string | null;
  }>;
  assistanceMeasures: AssistanceMeasureOption[];
  parentalStatuses: Array<{ code: string; label: string }>;
  guardianTypes: Array<{
    code: string;
    label: string;
    requiresDetail: boolean;
  }>;
  residenceEnvironments: Array<{
    code: string;
    label: string;
    /** `ปกติ / ไม่มีปัจจัยเสี่ยง` cannot be combined with any risk factor. */
    isExclusive: boolean;
    requiresDetail: boolean;
  }>;
}

export interface CancelCaseAssignmentPayload {
  cancel_reason: string;
}

export interface CancelCaseAssignmentResponse {
  success: boolean;
  data: { case_id: number; task_id: string };
}

export interface CaseFollowUpRound {
  task_id: string;
  task_status: string;
  /** `VISIT` = follow-up round, `ASSIST` = assistance round. */
  task_type?: string | null;
  assistance_measures?: Array<{ code: string; label: string }> | null;
  assistance_measure_detail?: string | null;
  assisted_at?: string | null;
  assistance_detail?: string | null;
  created_at: string;
  initial_assignee?: string | null;
  assignment_starts_at?: string | null;
  assignment_ends_at?: string | null;
  /** Link state of the round: ACTIVE, SCHEDULED, CANCELLED, EXPIRED, COMPLETED. */
  link_status?: string | null;
  cancelled_at?: string | null;
  cancel_reason?: string | null;
  cancelled_by_label?: string | null;
  assignment_note?: string | null;
  link_count: number;
  submitted_at?: string | null;
  visited_at?: string | null;
  follow_up_problem_category_code?: string | null;
  follow_up_problem_category_label?: string | null;
  follow_up_problem_category_guidance?: string | null;
  parental_status_code?: string | null;
  parental_status_label?: string | null;
  guardian_type_code?: string | null;
  guardian_type_label?: string | null;
  guardian_type_detail?: string | null;
  residence_environments?: Array<{ code: string; label: string }> | null;
  residence_environment_detail?: string | null;
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
  student_phone?: string | null;
  student_lat?: number | null;
  student_lng?: number | null;
  teacher_comment?: string | null;
  reason?: string | null;
  reason_flagged?: string | null;
  status: CaseStatus;
  status_label?: string | null;
  completion_outcome_code?: "CLOSED" | "REFERRED_AGENCY" | null;
  completion_outcome_label?: string | null;
  workflow_phase_code?: CaseWorkflowPhase | null;
  display_status_label?: string | null;
  status_badge_variant?: CaseBadgeVariant | null;
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
