import type { DataScope } from "../../auth/lib/permissions";

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

export interface LoginLinkCreatePayload {
  task_type: "LOGIN";
  type: "LOGIN";
  assigned_to_name: string;
  assigned_to_email?: string | null;
  role: string;
  permissions: string[];
  data_scope: DataScope;
  expires_value: number;
  expires_unit: LoginLinkDurationUnit;
}

export interface LoginLinkCreateResponse {
  task_id: string;
  magic_link: string;
  qr_code_data?: string | null;
  expires_at: string;
}

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

export interface RoleOption {
  name: string;
  label: string;
}
