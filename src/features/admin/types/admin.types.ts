import type { PaginationMeta } from "../../../lib/pagination";
import type { DataScope } from "../../auth/lib/permissions";

// --- System settings ---
export type SystemSettingValueType = "integer" | "time" | "enum";

export interface SystemSettingEnumOption {
  value: string;
  label: string;
}

export interface SystemSetting {
  setting_key: string;
  setting_value: string;
  description?: string | null;
  updated_at?: string | null;
  value_type?: SystemSettingValueType | null;
  enum_options?: SystemSettingEnumOption[] | null;
  min?: number | null;
  max?: number | null;
  editable?: boolean;
  group?: string | null;
}

export interface SettingsUpdatePayload {
  value: string;
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
  PersonID_Onec?: string | null;
  phone: string | null;
  email: string | null;
  affiliation: string | null;
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
  role?: string | null;
  roles: string[];
  labels?: string[];
  permissions: string[];
  status: string;
  data_scope?: DataScope;
  must_change_password?: boolean;
  temporary_password_issued_at?: string | null;
  temporary_password_expires_at?: string | null;
  deactivated_at?: string | null;
  deactivated_by?: number | null;
  deactivation_reason_code?: AccountDeactivationReasonCode | null;
  deactivation_note?: string | null;
  created_at?: string | null;
  student_uuid?: string | null;
}

export interface ManagedUserDetail extends ManagedUser {
  has_profile_location?: boolean;
  data_scope_labels?: {
    schools?: Array<{ id: number; name: string | null }>;
    gradeLevels?: Array<{ id: number; label: string }>;
  };
}

export interface UserAddressDetail {
  address_line: string | null;
  address_village_no: string | null;
  address_street: string | null;
  address_soi: string | null;
  address_trok: string | null;
  address_sub_district: string | null;
  address_district: string | null;
  address_province: string | null;
  address_postal_code: string | null;
  address_latitude: number | null;
  address_longitude: number | null;
}

export interface UserAddressRevealPayload {
  reason_code: string;
  reason_note?: string;
}

export interface UserNationalIdRevealResponse {
  PersonID_Onec: string | null;
}

export interface UserSavePayload {
  id?: number | null;
  username: string;
  password?: string;
  FirstName: string;
  LastName: string;
  PersonID_Onec: string;
  phone?: string;
  email?: string;
  affiliation?: string;
  line_id?: string;
  address_line?: string;
  address_village_no?: string;
  address_street?: string;
  address_soi?: string;
  address_trok?: string;
  address_sub_district?: string;
  address_district?: string;
  address_province?: string;
  address_postal_code?: string;
  address_latitude?: number | null;
  address_longitude?: number | null;
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

export interface ReissueStudentPasswordResponse {
  success: boolean;
  userId: number;
  username: string;
  tempPassword: string;
  temporaryPasswordIssuedAt: string;
  temporaryPasswordExpiresAt: string;
}

/** Account lifecycle shared by staff and student account management views. */
export type AccountLifecycleStatus =
  | "PENDING_FIRST_LOGIN"
  | "ACTIVE"
  | "TEMP_PASSWORD_EXPIRED"
  | "DISABLED";

export type StudentAccountManagementStatus = AccountLifecycleStatus;

export type StudentAccountStatusCounts = Record<AccountLifecycleStatus, number>;

export interface UserPaginationMeta extends PaginationMeta {
  lifecycleStatusCounts?: StudentAccountStatusCounts;
}

export interface StudentAccountPaginationMeta extends PaginationMeta {
  statusCounts?: StudentAccountStatusCounts;
}

export interface StudentAccountListQuery extends StudentAccountFilter {
  searchTerm?: string;
  accountStatus?: StudentAccountManagementStatus;
  onlyExpired?: boolean;
}

export interface StudentAccountManagementItem {
  userId: number;
  username: string;
  studentId: string | null;
  studentName: string;
  schoolId: number | null;
  schoolName: string | null;
  grade: string | null;
  gradeLevelId: number | null;
  room: number | null;
  academicYear?: number | null;
  semester?: number | null;
  status: StudentAccountManagementStatus;
  accountStatus: string | null;
  mustChangePassword: boolean;
  temporaryPasswordIssuedAt: string | null;
  temporaryPasswordExpiresAt: string | null;
  temporaryPasswordRemainingSeconds?: number | null;
  deactivatedAt?: string | null;
  deactivatedBy?: number | null;
  deactivationReasonCode?: AccountDeactivationReasonCode | null;
  deactivationNote?: string | null;
  createdAt?: string | null;
}

export interface BulkReissueStudentAccountsPayload extends StudentAccountListQuery {
  userIds?: number[];
}

export interface BulkReissueStudentAccountsResponse {
  success: boolean;
  requestedCount: number;
  reissuedCount: number;
  skippedCount: number;
  credentials: StudentAccountCredential[];
  skipped: Array<{ userId: number; reason: string }>;
}

export interface DeactivateStudentAccountResponse {
  success: boolean;
  userId: number;
  status: "DISABLED";
  reasonCode?: AccountDeactivationReasonCode | null;
  note?: string | null;
  reason: string | null;
}

export type AccountDeactivationReasonCode =
  | "STAFF_LEFT"
  | "TRANSFERRED"
  | "DUPLICATE"
  | "SECURITY"
  | "OTHER";

export interface AccountDeactivationPayload {
  reasonCode: AccountDeactivationReasonCode;
  note?: string;
}

export interface AccountReactivateResponse {
  success: boolean;
  userId: number;
  status: "ACTIVE";
  needsReissue?: boolean;
}

export interface StudentAccountFilter {
  studentIds?: string[];
  searchTerm?: string;
  schoolId?: number;
  province?: string;
  district?: string;
  subDistrict?: string;
  grade?: string;
  room?: number;
  onlyWithoutAccount?: boolean;
  page?: number;
  limit?: number;
}

export interface StudentAccountCandidate {
  studentId: string;
  studentName: string;
  schoolId: number;
  schoolName: string | null;
  grade: string | null;
  room: number | null;
  academicYear: number | null;
  semester: number | null;
  hasActiveAccount: boolean;
  username: string | null;
}

export interface StudentAccountPreview {
  success: boolean;
  data: {
    summary: {
      totalCount: number;
      withoutAccountCount: number;
      existingAccountCount: number;
    };
    candidates: StudentAccountCandidate[];
    limit: number;
    meta?: PaginationMeta;
  };
}

export interface StudentAccountCredential {
  userId: number;
  username: string;
  tempPassword: string;
  studentName: string;
  schoolName: string | null;
  grade: string | null;
  room: number | null;
  temporaryPasswordIssuedAt?: string | null;
  temporaryPasswordExpiresAt?: string | null;
}

export interface StudentAccountGenerateResponse {
  success: boolean;
  createdCount: number;
  credentials: StudentAccountCredential[];
}

// --- Async large-batch generation jobs ---
export type StudentAccountBatchJobStatus =
  | "PENDING"
  | "RUNNING"
  | "COMPLETED"
  | "FAILED"
  | "INTERRUPTED"
  | "CANCELED";

export interface StudentAccountBatchJob {
  id: string;
  status: StudentAccountBatchJobStatus;
  totalCandidates: number;
  processedCount: number;
  createdCount: number;
  skippedCount: number;
  failedCount: number;
  errorSummary: string | null;
  scope: {
    schoolId: number | null;
    schoolName: string | null;
    province: string | null;
    district: string | null;
    subDistrict: string | null;
    grade: string | null;
    room: number | null;
  };
  startedAt: string | null;
  finishedAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface StudentAccountBatchListQuery {
  status?: StudentAccountBatchJobStatus;
  page?: number;
  limit?: number;
}

export interface StudentAccountBatchListResponse {
  success: boolean;
  data: StudentAccountBatchJob[];
  meta: { page: number; limit: number; total: number };
}

export interface StudentAccountBatchJobResponse {
  success: boolean;
  data: StudentAccountBatchJob;
}

export interface StudentAccountBatchCredentialResponse {
  success: boolean;
  jobId: string;
  meta: { page: number; limit: number; total: number };
  reissuedCount: number;
  skippedCount: number;
  credentials: StudentAccountCredential[];
  skipped: Array<{ userId: number; reason: string }>;
}

// --- Roles / role groups ---
export type RoleScopeMode =
  | "flexible"
  | "global"
  | "province"
  | "district"
  | "sub_district"
  | "school";

export type RoleScopePolicy = "ASSIGNABLE" | "OWN_ONLY";

export interface RoleDefinition {
  id: number;
  name: string;
  label: string;
  rank: number;
  default_permissions: string[];
  scope_mode: RoleScopeMode;
  scope_policy: RoleScopePolicy;
  is_assignable: boolean;
  is_system: boolean;
  user_count?: number;
  login_link_count?: number;
}

export interface RoleGroupForm {
  name: string;
  label: string;
  rank: number;
  scope_mode?: RoleScopeMode;
  default_permissions: string[];
}
