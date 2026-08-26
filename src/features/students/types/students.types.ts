export type StudentEnrollmentState = "current-active" | "all";
export type StudentStatusFilterValue = "ALL" | string;

export interface StudentListItem {
  /** App-relative photo path; the letter fallback renders without one. */
  photo_url?: string | null;
  id: string;
  name: string;
  grade: string;
  room: string;
  school_name?: string;
  school_id?: number | string;
  student_status_label?: string;
  student_status_category?: string;
  student_status_badge_variant?:
    | "default"
    | "secondary"
    | "destructive"
    | "success"
    | "warning";
  total_late?: number;
  total_absent?: number;
}

export interface StudentListQuery {
  schoolId?: string;
  province?: string;
  district?: string;
  subDistrict?: string;
  grade?: string;
  room?: string;
  searchTerm?: string;
  studentStatusCode?: StudentStatusFilterValue;
  enrollmentState?: StudentEnrollmentState;
  /** `AT_RISK` = every tier except NORMAL; a specific tier narrows further. */
  riskTier?: "AT_RISK" | "HIGH" | "WATCH" | "NORMAL";
  page?: number;
  limit?: number;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
}

export interface StudentListResult {
  items: StudentListItem[];
  meta: PaginationMeta;
}

export interface StudentFilterOptions {
  grades: string[];
  rooms: string[];
}

export interface StudentDetail extends Record<string, unknown> {
  /** App-relative photo path (`/api/students/:id/photo?v=…`); null when unset. */
  photo_url?: string | null;
  /** Opaque student UUID — the client-facing identifier after the B1.3 swap. */
  id?: string;
  PersonID_Onec: string;
  PassportNumber_Onec?: string;
  FirstName?: string;
  LastName?: string;
  FirstName_Onec?: string;
  MiddleName_Onec?: string;
  LastName_Onec?: string;
  SchoolID_Onec?: number | string;
  AcademicYear_Onec?: number | string;
  Semester_Onec?: number | string;
  classroom_id?: number | string;
  school_term_id?: number | string;
  student_number?: string | null;
  student_status_code?: number | null;
  GPAX_Onec?: number | string;
  term_gpa?: number | string | null;
  school_name?: string;
  school_id?: number | string;
  grade?: string;
  grade_label?: string;
  room?: string;
  risk_tier?: "HIGH" | "WATCH" | "NORMAL";
  homeroom_teacher_name?: string | null;
  student_status_label?: string;
  student_status_category?: string;
  student_status_badge_variant?:
    | "default"
    | "secondary"
    | "destructive"
    | "success"
    | "warning";
  masked_fields?: string[];
  /** Pre-built Thai home address (from student_term) for visit-form prefill. */
  address?: string;
  address_house_no?: string | null;
  VillageNumber_Onec?: string | number | null;
  Street_Onec?: string | null;
  Soi_Onec?: string | null;
  Trok_Onec?: string | null;
  ProvinceNameThai_Onec?: string | null;
  DistrictNameThai_Onec?: string | null;
  SubDistrictNameThai_Onec?: string | null;
  PostalCode_Onec?: string | null;
  address_latitude?: number | null;
  address_longitude?: number | null;
  /** Best-available home coordinate: a confirmed home-visit/profile pin when
   * one exists, otherwise a geocoded approximate (see `is_approximate_home_location`). */
  resolved_home_lat?: number | null;
  resolved_home_lng?: number | null;
  is_approximate_home_location?: boolean;
  /** Canonical person-level contact channels; independent of login accounts. */
  contact?: StudentContact | null;
  guardians?: StudentGuardian[];
  /** Login account linked to this person; null when the student has no account. */
  account?: StudentAccountSummary | null;
}

export interface StudentAccountSummary {
  user_id: number;
  username: string;
  status: string;
  lifecycle_status:
    | "PENDING_FIRST_LOGIN"
    | "ACTIVE"
    | "TEMP_PASSWORD_EXPIRED"
    | "DISABLED";
  must_change_password: boolean;
}

export interface StudentContact {
  phone: string | null;
  email: string | null;
  line_id: string | null;
}

export type StudentGuardianRelation = "FATHER" | "MOTHER" | "GUARDIAN";

export interface StudentGuardian {
  id: string;
  relation: StudentGuardianRelation;
  /** What a GUARDIAN actually is (ยาย, ลุง, ...); null for FATHER/MOTHER. */
  relation_note: string | null;
  first_name?: string;
  last_name?: string | null;
  /** Compatibility field while older backend versions are drained. */
  full_name: string;
  phone: string | null;
  email: string | null;
  line_id: string | null;
  is_primary: boolean;
}

export interface StudentGuardianInput {
  relation: StudentGuardianRelation;
  relation_note?: string | null;
  first_name: string;
  last_name: string;
  phone?: string | null;
  email?: string | null;
  line_id?: string | null;
  is_primary?: boolean;
}

export interface StudentUpdatePayload {
  FirstName_Onec?: string;
  MiddleName_Onec?: string | null;
  LastName_Onec?: string;
  student_number?: string | null;
  student_status_code?: number;
  term_gpa?: number | null;
  address_house_no?: string | null;
  VillageNumber_Onec?: string | null;
  Street_Onec?: string | null;
  Soi_Onec?: string | null;
  Trok_Onec?: string | null;
  ProvinceNameThai_Onec?: string | null;
  DistrictNameThai_Onec?: string | null;
  SubDistrictNameThai_Onec?: string | null;
  PostalCode_Onec?: string | null;
  address_latitude?: number | null;
  address_longitude?: number | null;
  contact?: {
    phone?: string | null;
    email?: string | null;
    line_id?: string | null;
  };
  guardians?: StudentGuardianInput[];
}

export interface StudentCreatePayload extends StudentUpdatePayload {
  PersonID_Onec: string;
  PassportNumber_Onec?: string | null;
  FirstName_Onec: string;
  LastName_Onec: string;
  classroom_id: number;
  student_status_code: number;
}

export interface StudentManagementClassroomOption {
  id: string;
  schoolId: number;
  schoolName: string;
  schoolTermId: string;
  academicYear: number;
  semester: number;
  gradeLevelId: number;
  gradeLabel: string;
  roomCode: string;
  roomName: string | null;
}

export interface StudentManagementOptions {
  classrooms: StudentManagementClassroomOption[];
}

export interface StudentNationalIdCorrectionPayload {
  newNationalId: string;
}

export type StudentPiiField = "PersonID_Onec" | "PassportNumber_Onec";

export type StudentPiiFieldGroup = "NATIONAL_ID" | "PASSPORT";

export type StudentPiiReasonCode =
  | "HOME_VISIT"
  | "CONTACT_PARENT"
  | "VERIFY_DATA"
  | "COORDINATE_AGENCY"
  | "OTHER";

export interface StudentPiiRevealRequest {
  field_group: StudentPiiFieldGroup;
  // Omitted for data-subject self-reveal (the student viewing their own id):
  // the backend waives the reason and records SELF_ACCESS. Staff reveals still
  // send a reason_code.
  reason_code?: StudentPiiReasonCode;
  reason_note?: string;
}

export interface StudentPiiRevealResponse {
  field_group: StudentPiiFieldGroup;
  values: Partial<Record<StudentPiiField, string>>;
}

export interface StudentCase {
  id: string | number;
  created_at: string;
  reason_flagged: string;
  status: string;
}

export interface StudentAttendanceCalendarRecord {
  date: string;
  status: number;
  period?: string | number;
}

export interface StudentAttendanceHistoryRecord {
  id?: number | string;
  date: string;
  status: string;
  subject?: string;
}

export interface StudentAttendanceSummaryStats {
  present: number;
  absent: number;
  late: number;
  total: number;
}

export interface StudentAttendanceSummaryResponse {
  records: StudentAttendanceHistoryRecord[];
  stats: StudentAttendanceSummaryStats;
}

export interface StudentProfileAttendanceDay {
  attendanceCategory: "ALL_PERIODS" | "SOME_PERIODS" | "NO_PERIODS";
  attendanceCategoryLabel: string;
  date: string;
  statusCode: number;
  statusInternalCode: string;
  statusLabel: string;
  statusBadgeVariant: string;
}

export interface StudentProfileSummary {
  term: {
    academicYear: number;
    semester: number;
    startsOn: string | null;
    endsOn: string | null;
  };
  grades: {
    termGpa: number | null;
    cumulativeGpax: number | null;
  };
  careConsiderations: {
    disadvantages: Array<{ code: string; labelTh: string; recordedAt: string }>;
    disabilities: Array<{ code: string; labelTh: string; recordedAt: string }>;
  };
  attendance: {
    ratePercent: number | null;
    counts: {
      present: number;
      absent: number;
      late: number;
      leave: number;
      total: number;
    };
    days: StudentProfileAttendanceDay[];
  };
}

export interface StudentSubjectAttendanceRecord {
  date: string;
  subjectCode: string | null;
  subjectName: string | null;
  statusCode: number;
  statusInternalCode: string;
  statusLabel: string;
  statusBadgeVariant: string;
  recordedAt: string | null;
  checkingStartedAt: string | null;
  submittedAt: string | null;
  recordedBy: string | null;
}

export type PiiExportStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "DOWNLOADED"
  | "EXPIRED"
  | "CANCELLED";

export interface PiiExportScope {
  global?: boolean;
  provinces?: string[];
  districts?: string[];
  sub_districts?: string[];
  school_ids?: Array<number | string>;
  grade_levels?: Array<number | string>;
  room_ids?: Array<number | string>;
}

export interface PiiExportRequest {
  id: string;
  requester_user_id: number;
  requester_username: string | null;
  requester_name: string | null;
  approver_user_id: number | null;
  approver_username: string | null;
  approver_name: string | null;
  status: PiiExportStatus;
  scope_snapshot: PiiExportScope;
  include_full_national_id: boolean;
  reason_code: StudentPiiReasonCode;
  reason_note: string | null;
  row_estimate: number | null;
  selected_student_count?: number;
  download_expires_at: string | null;
  downloaded_at: string | null;
  rejected_reason: string | null;
  created_at: string;
  updated_at: string;
  download_token?: string;
}

export interface PiiExportRequestListQuery {
  status?: PiiExportStatus;
  page?: number;
  limit?: number;
}

export interface CreatePiiExportRequestPayload {
  scope: PiiExportScope;
  include_full_national_id?: boolean;
  selected_student_uuids?: string[];
  reason_code: StudentPiiReasonCode;
  reason_note: string;
}

export interface RejectPiiExportRequestPayload {
  id: string;
  rejected_reason: string;
}

export interface PiiExportRequestListResult {
  data: PiiExportRequest[];
  meta: PaginationMeta;
}

export interface PiiExportRequestResponse {
  success: boolean;
  data: PiiExportRequest;
}

export interface PiiExportDownloadResult {
  blob: Blob;
  filename: string;
}
