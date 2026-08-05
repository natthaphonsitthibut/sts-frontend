export type VisitLinkState = "ACTIVE" | "LOCKED" | "EXPIRED" | "SCHEDULED";

export interface VisitLink {
  id: string;
  task_id: string;
  case_id: number | string;
  task_type: "VISIT";
  assigned_to_name: string | null;
  assigned_to_email: string | null;
  expires_at: string;
  opens_at?: string | null;
  status: string;
  magic_link: string | null;
  created_at: string;
  admin_locked?: boolean | number;
  admin_lock_reason?: string | null;
  admin_lock_at?: string | null;
  delegation_depth?: number | string | null;
  link_state?: VisitLinkState | null;
  student_name?: string | null;
  student_first_name?: string | null;
  student_last_name?: string | null;
  student_school?: string | null;
  case_status?: string | null;
  reason_flagged?: string | null;
  school_id?: number | string | null;
  school_name?: string | null;
  student_id?: string | null;
  grade_level_id?: number | string | null;
  grade_label?: string | null;
  room?: number | string | null;
}

export interface VisitLinkSummary {
  total: number;
  active: number;
  locked: number;
  expired: number;
  scheduled: number;
}

export interface VisitLinkListQuery {
  status?: string;
  searchTerm?: string;
  province?: string;
  district?: string;
  subDistrict?: string;
  schoolId?: string;
  gradeLevelId?: number | null;
  room?: string;
  page?: number;
  limit?: number;
}
