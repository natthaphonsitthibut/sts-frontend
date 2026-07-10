import type { DataScope } from "../../auth/lib/permissions";
import type { CaseReferralRecord } from "../../cases/types/cases.types";

export type TaskType = "ATTENDANCE" | "VISIT" | "LOGIN";
export type TaskDurationUnit = "minutes" | "hours" | "days" | "weeks";
export type AttendanceTaskStatus = "P_PRESENT" | "P_ABSENT" | "P_LATE";

export interface TaskCreatePayload {
  task_type: TaskType;
  type: TaskType;
  assigned_to_name: string;
  assigned_to_email?: string | null;
  assigned_to_phone?: string | null;
  expires_value: number;
  expires_unit: TaskDurationUnit;
  /** ISO datetime the link becomes usable; omit/null = opens immediately. */
  opens_at?: string | null;
  student_name?: string | null;
  student_first_name?: string | null;
  student_last_name?: string | null;
  student_id?: string | null;
  student_school?: string | null;
  student_address?: string | null;
  address_line?: string | null;
  address_province?: string | null;
  address_district?: string | null;
  address_sub_district?: string | null;
  postal_code?: string | null;
  student_lat?: number | null;
  student_lng?: number | null;
  reason_flagged?: string | null;
  target_grade?: string | null;
  target_room?: string | null;
  subject?: string | null;
  subject_id?: number | null;
  timetable_slot_ids?: number[];
  target_school_id?: number | null;
  role?: string | null;
  permissions?: string[];
  data_scope?: DataScope;
  existing_case_id?: string | null;
}

export interface TaskCreateResponse {
  task_id: string;
  magic_link: string;
  qr_code_data?: string | null;
  expires_at: string;
}

export interface TaskAccessTask {
  id: string;
  type: TaskType | string;
  assigned_to_name?: string | null;
  expires_at?: string | null;
  status?: string;
  reason?: string;
  subject?: string | null;
  target_grade?: string | null;
  target_room?: string | null;
  target_school_id?: string | number | null;
  student_name?: string | null;
  student_first_name?: string | null;
  student_last_name?: string | null;
  student_school?: string | null;
  student_address?: string | null;
  address_line?: string | null;
  address_province?: string | null;
  address_district?: string | null;
  address_sub_district?: string | null;
  postal_code?: string | null;
  reason_flagged?: string | null;
  student_lat?: number | null;
  student_lng?: number | null;
  auth_required?: boolean;
  can_delegate?: boolean;
  delegation_depth?: number;
  max_delegation_depth?: number;
  school_name?: string | null;
  timetable_slots?: Array<{
    id: number;
    day_of_week: number;
    period: number;
    subject_id: number;
    subject_name_th?: string | null;
    teacher_name?: string | null;
  }>;
}

export interface TaskGuestStudent {
  id: string;
  name: string;
  grade: string;
  room: string;
}

export interface TaskHistoryEntry {
  student_id: string;
  student_name: string;
  status: number | string;
}

export interface TaskSubmitResponse {
  success?: boolean;
  error?: string;
  message?: string;
  session_token?: string;
}

export interface TaskDelegationPayload {
  new_assignee_name: string;
  new_assignee_phone?: string | null;
  new_assignee_email?: string | null;
  expires_in_hours: number;
}

export interface TaskDelegationResponse {
  magic_link: string;
  qr_code_data: string | null;
  expires_at: string;
  delegation_depth: number;
}

export interface TaskChainLink {
  id: string | number;
  assigned_to_name?: string | null;
  assigned_to_email?: string | null;
  status?: string | null;
  created_at?: string | null;
  expires_at?: string | null;
  magic_link?: string | null;
  admin_locked?: boolean | number | null;
  delegation_depth?: number | null;
  delegated_by_name?: string | null;
  delegated_at?: string | null;
  submission?: TaskSubmission | null;
}

export interface TaskSubmission {
  cause_category?: string | null;
  cause_detail?: string | null;
  recommendation?: string | null;
  submitted_at?: string | null;
  visit_lat?: number | string | null;
  visit_lng?: number | string | null;
  photo_paths?: string | null;
}

export interface TaskChainResponse {
  task_id: string;
  case_id?: number | null;
  task_type: TaskType | string;
  target_grade?: string | null;
  target_room?: string | null;
  student_name?: string | null;
  student_school?: string | null;
  student_address?: string | null;
  reason_flagged?: string | null;
  task_status?: string | null;
  case_status?: string | null;
  result_summary?: string | null;
  chain: TaskChainLink[];
  reviews?: Array<Record<string, unknown>>;
  referrals?: CaseReferralRecord[];
}

export type WorkSessionEndReason = "MANUAL" | "SUBMITTED";

export interface WorkSessionInfo {
  id: string;
  started_at: string;
  ping_interval_seconds: number;
}

export interface WorkSessionStatusResponse {
  success: true;
  session: WorkSessionInfo | null;
}

export interface WorkSessionStartResponse {
  success: true;
  session: WorkSessionInfo;
}
