import type { DataScope } from "../lib/permissions";

export interface AuthUser {
  id: number;
  username: string;
  FirstName: string | null;
  LastName: string | null;
  roles: string[];
  labels?: string[];
  permissions: string[];
  data_scope?: DataScope;
  data_scope_labels?: {
    schools?: Array<{ id: number; name: string | null }>;
  };
  PersonID_Onec?: string;
  student_uuid?: string;
  phone?: string | null;
  email?: string | null;
  affiliation?: string | null;
  line_id?: string | null;
  address_line?: string | null;
  address_village_no?: string | null;
  address_street?: string | null;
  address_soi?: string | null;
  address_trok?: string | null;
  address_sub_district?: string | null;
  address_district?: string | null;
  address_province?: string | null;
  address_postal_code?: string | null;
  address_latitude?: number | null;
  address_longitude?: number | null;
  virtual_login?: boolean;
  magic_link_token?: string;
  magic_session_token?: string;
  virtual_auth_token?: string;
  must_change_password?: boolean;
}

export type AuthStorageTarget = "auto" | "local" | "session";
export type ResolvedAuthStorageTarget = Exclude<AuthStorageTarget, "auto">;

export interface AuthSessionSnapshot {
  user: AuthUser | null;
  hasAdminAccess: boolean;
  storageTarget: ResolvedAuthStorageTarget | null;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
}

export interface UpdateProfilePayload {
  FirstName: string;
  LastName: string;
  phone: string;
  email: string;
  affiliation: string;
  line_id: string;
  address_line: string;
  address_village_no: string;
  address_street: string;
  address_soi: string;
  address_trok: string;
  address_sub_district: string;
  address_district: string;
  address_province: string;
  address_postal_code: string;
  address_latitude: number | null;
  address_longitude: number | null;
}

export interface MockThaIdLoginPayload {
  personId: string;
}

export interface MagicLoginVerifyResponse extends Partial<AuthUser> {
  otp_required?: boolean;
  email?: string;
  assigned_to_name?: string;
  expires_at?: string | null;
}

export interface MagicOtpVerifyResponse {
  session_token?: string;
}
