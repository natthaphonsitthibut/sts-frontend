import type { DataScope } from "../../auth/lib/permissions";
import type { RoleScopeMode, RoleScopePolicy } from "../../admin/types/admin.types";

export interface LoginLink {
  id: string;
  task_id: string;
  assigned_to_name: string | null;
  assigned_to_email: string | null;
  expires_at: string;
  status: string;
  magic_link: string;
  created_at: string;
  first_used_at?: string | null;
  admin_locked?: boolean | number;
  /** Server-computed lifecycle state (accounts for opens_at/expiry). */
  link_state?: "ACTIVE" | "LOCKED" | "EXPIRED" | "SCHEDULED" | null;
  login_role?: string | null;
  login_role_label?: string | null;
  login_permissions?: string[];
  login_data_scope?: DataScope;
}

export interface LoginLinkSummary {
  total: number;
  active: number;
  locked: number;
  expired: number;
  scheduled: number;
}

export interface LoginLinkListQuery {
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

export type LoginLinkDurationUnit = "minutes" | "hours" | "days";

export type LinkAdminAction = "lock" | "unlock";

export interface LinkAdminPayload {
  action: LinkAdminAction;
  reason: string;
}

export interface LinkAdminResponse {
  message: string;
  link_id: string;
  admin_locked: number | boolean;
}

export interface AdminLinkRecord {
  student_id: string;
  student_name: string;
  status: number | string;
  session_kind?: "DAILY" | "SUBJECT" | string | null;
  period?: number | string | null;
  timetable_slot_id?: number | string | null;
  subject_name_th?: string | null;
  subject_code?: string | null;
}

/** Admin-only link detail (works for closed/expired links), keyed by link id. */
export interface AdminLinkDetail {
  link_id: string;
  task_id: string;
  type: string;
  task_type: string;
  status: "ACTIVE" | "LOCKED" | "EXPIRED";
  admin_locked: number | boolean;
  admin_lock_reason: string | null;
  magic_link: string | null;
  expires_at: string;
  subject: string | null;
  assigned_to_name: string | null;
  assigned_to_email: string | null;
  created_at?: string | null;
  first_used_at?: string | null;
  school_name: string | null;
  target_grade: string | null;
  target_room: string | null;
  target_school_id: number | string | null;
  login_role: string | null;
  login_role_label?: string | null;
  login_permissions: string[];
  login_data_scope: DataScope;
  records: AdminLinkRecord[];
}

export interface RoleOption {
  name: string;
  label: string;
  /** Standard permissions for this role — used to pre-fill the permission editor. */
  default_permissions: string[];
  /** Scope rule for this role — drives the scope guard in the editor. */
  scope_mode: RoleScopeMode;
  scope_policy: RoleScopePolicy;
}
