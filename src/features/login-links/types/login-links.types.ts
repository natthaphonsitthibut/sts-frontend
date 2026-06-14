import type { DataScope } from "../../auth/lib/permissions";
import type { RoleScopeMode } from "../../admin/types/admin.types";

export interface LoginLink {
  id: string;
  task_id: string;
  assigned_to_name: string | null;
  assigned_to_email: string | null;
  expires_at: string;
  status: string;
  magic_link: string;
  created_at: string;
  admin_locked?: boolean | number;
  login_role?: string | null;
  login_role_label?: string | null;
  login_permissions?: string[];
  login_data_scope?: DataScope;
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
  school_name: string | null;
  target_grade: string | null;
  target_room: string | null;
  target_school_id: number | string | null;
  login_role: string | null;
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
}
