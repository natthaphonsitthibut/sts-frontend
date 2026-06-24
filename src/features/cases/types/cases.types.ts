export type KnownCaseStatus =
  | "OPEN"
  | "PENDING_REVIEW"
  | "IN_PROGRESS"
  | "AWAITING_HELP"
  | "RESOLVED";

export type CaseStatus = KnownCaseStatus | (string & {});

export type CaseReviewAction = "ASSIST" | "FORWARD" | "CLOSE";

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
}

export interface CaseListQuery {
  status?: string;
  searchTerm?: string;
  page?: number;
  limit?: number;
}

/** Scope-aware case counts from `GET /api/stats` (server-computed aggregates). */
export interface CaseStats {
  total: number;
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
  reviewed_by: string;
  reviewed_at: string;
  review_note: string | null;
}

export interface CaseReviewPayload {
  review_action: CaseReviewAction;
  review_note?: string | null;
  agency_id?: number | null;
  referral_note?: string | null;
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

export interface CaseReviewResponse {
  success?: boolean;
  message?: string;
  case?: Record<string, unknown> | null;
  review?: CaseReviewRecord | null;
  referral?: CaseReferralRecord | null;
}
