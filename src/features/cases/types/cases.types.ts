import type { PaginationMeta } from "../../../lib/pagination";

export type KnownCaseStatus =
  | "OPEN"
  | "PENDING_REVIEW"
  | "IN_PROGRESS"
  | "AWAITING_HELP"
  | "RESOLVED";

export type CaseStatus = KnownCaseStatus | (string & {});

export type CaseReviewAction = "ASSIST" | "FORWARD" | "CLOSE";
export type CaseResolutionOutcome =
  | "RETURNED_TO_SCHOOL"
  | "TRANSFERRED_SCHOOL"
  | "ILLNESS"
  | "WORKING"
  | "UNREACHABLE"
  | "REFERRED_EXTERNAL"
  | "OTHER";
export type CaseReferralOutcomeStatus =
  | "ACKNOWLEDGED"
  | "ACCEPTED"
  | "DECLINED"
  | "RETURNED";

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
  created_at: string;
  active_link_id?: string | null;
  active_link_created_at?: string | null;
  active_link_expires_at?: string | null;
  active_link_assigned_to?: string | null;
  link_state?: "ACTIVE" | "LOCKED" | "EXPIRED" | "NONE" | null;
}

export interface CaseListQuery {
  status?: string;
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
  awaitingHelp: number;
  resolved: number;
  today: number;
  pendingReview: number;
  activeLinks?: number;
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
  agency_id?: number | null;
  referral_note?: string | null;
  resolution_outcome?: CaseResolutionOutcome | null;
}

export interface ReferralAgency {
  id: number;
  name: string;
  agency_type: string;
  province?: string | null;
  district?: string | null;
  sub_district?: string | null;
  phone?: string | null;
  contact_person?: string | null;
  address?: string | null;
}

export interface CaseReferralRecord {
  id: string;
  case_id: number;
  agency_id?: number | null;
  agency_name_snapshot: string;
  agency_type_snapshot: string;
  referred_by?: number | null;
  referred_by_label?: string | null;
  referred_at: string;
  referral_note?: string | null;
  status: string;
  outcome?: string | null;
  responded_at?: string | null;
  phone?: string | null;
  contact_person?: string | null;
  address?: string | null;
}

export interface CaseReferralOutcomePayload {
  status: CaseReferralOutcomeStatus;
  outcome?: string | null;
}

export interface CaseReferralOutcomeResponse {
  success?: boolean;
  data?: CaseReferralRecord | null;
}

export interface CaseReviewResponse {
  success?: boolean;
  message?: string;
  case?: Record<string, unknown> | null;
  review?: CaseReviewRecord | null;
  referral?: CaseReferralRecord | null;
}
