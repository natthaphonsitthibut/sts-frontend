export interface StudentListItem {
  id: string;
  name: string;
  grade: string;
  room: string;
  school_name?: string;
  school_id?: number | string;
  total_late?: number;
  total_absent?: number;
}

export interface StudentListQuery {
  schoolId?: string;
  grade?: string;
  room?: string;
  searchTerm?: string;
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
  GPAX_Onec?: number | string;
  school_name?: string;
  school_id?: number | string;
  grade?: string;
  grade_label?: string;
  room?: string;
  masked_fields?: string[];
  /** Pre-built Thai home address (from student_term) for visit-form prefill. */
  address?: string;
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
