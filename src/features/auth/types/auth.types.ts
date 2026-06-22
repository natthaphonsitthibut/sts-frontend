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
  PersonID_Onec?: string;
  student_uuid?: string;
  affiliation?: string | null;
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
