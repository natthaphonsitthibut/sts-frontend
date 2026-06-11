import type { DataScope } from "../../auth/lib/permissions";

// --- System settings ---
export interface SystemSetting {
  setting_key: string;
  setting_value: string;
  description?: string | null;
  updated_at?: string | null;
}

export interface SettingsUpdatePayload {
  value: string;
  description?: string | null;
}

export interface SettingsUpdateResponse {
  success?: boolean;
  data?: SystemSetting;
}

// --- Users ---
export interface ManagedUser {
  id: number | null;
  username: string;
  FirstName: string | null;
  LastName: string | null;
  fullname?: string | null;
  PersonID_Onec: string | null;
  phone: string | null;
  email: string | null;
  affiliation: string | null;
  role?: string | null;
  roles: string[];
  labels?: string[];
  permissions: string[];
  status: string;
  data_scope?: DataScope;
  created_at?: string | null;
}

export interface UserSavePayload {
  id?: number | null;
  username: string;
  password?: string;
  FirstName: string;
  LastName: string;
  PersonID_Onec: string;
  phone: string;
  email: string;
  affiliation: string;
  role: string | null;
  roles: string[];
  labels?: string[];
  permissions: string[];
  status: string;
  data_scope: DataScope;
}

export interface CreateUserResponse {
  success: boolean;
  userId: number;
  tempPassword?: string;
  must_change_password?: boolean;
}

// --- Roles / role groups ---
export type RoleScopeMode =
  | "flexible"
  | "global"
  | "province"
  | "district"
  | "sub_district"
  | "school";

export interface RoleDefinition {
  id: number;
  name: string;
  label: string;
  rank: number;
  default_permissions: string[];
  scope_mode: RoleScopeMode;
  is_system: boolean;
  user_count?: number;
  login_link_count?: number;
}

export interface RoleGroupForm {
  name: string;
  label: string;
  rank: number;
  scope_mode: RoleScopeMode;
  default_permissions: string[];
}
