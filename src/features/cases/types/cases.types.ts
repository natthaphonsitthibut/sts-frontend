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
  reviewed_by?: string | null;
}

export interface CaseReviewResponse {
  success?: boolean;
  message?: string;
  case?: Record<string, unknown> | null;
  review?: CaseReviewRecord | null;
}
