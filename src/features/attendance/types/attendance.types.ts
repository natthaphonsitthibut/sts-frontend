export type AttendanceSelectionStatus =
  | "P_PRESENT"
  | "P_ABSENT"
  | "P_LATE"
  | "P_LEAVE"
  | "NONE";

export interface AttendanceStudent {
  id: string;
  name: string;
  grade: string;
  room: string;
  school_id?: string | number;
  school_name?: string;
  total_late?: number | string;
  total_absent?: number | string;
}

export interface AttendanceStudentQuery {
  grade: string;
  room: string;
  schoolId: string | number;
}

export interface AttendanceHistoryRecord {
  id: string;
  name: string;
  grade: string;
  room: string;
  status: AttendanceSelectionStatus;
  check_date?: string;
  PersonID_Onec?: string;
  school_id?: string | number;
  student_id?: string;
  student_name?: string;
  recorded_by?: string;
  RecordedBy?: string;
}

export interface AttendanceSaveRecord {
  student_id: string;
  status: AttendanceSelectionStatus;
}

export interface AttendanceAutoCase {
  case_id: number;
  student_name: string;
  student_school: string;
  reason_flagged: string;
}

export interface AttendanceSaveResponse {
  success: boolean;
  newCases?: AttendanceAutoCase[];
  calendarConfigured?: boolean;
  session?: {
    id: string;
    status: AttendanceSessionStatus;
    revision: number;
  };
}

export type SchoolTermStatus = "DRAFT" | "ACTIVE" | "CLOSED";
export type CalendarDayType = "SCHOOL_DAY" | "HOLIDAY" | "CANCELLED";
export type AttendanceSessionStatus =
  | "OPEN"
  | "SUBMITTED"
  | "REOPENED"
  | "VOIDED";

export interface AttendanceSession {
  id: string;
  status: AttendanceSessionStatus;
  revision: number;
  expectedRosterCount: number;
  recordedCount: number;
  submittedAt: string | null;
  correctionReason: string | null;
}

export interface AttendanceSessionContext {
  calendarConfigured: boolean;
  term: {
    id: string;
    academicYear: number;
    semester: number;
    status: SchoolTermStatus;
  } | null;
  dayType: CalendarDayType | null;
  expectedRosterCount: number;
  session: AttendanceSession | null;
}

export type AttendanceSessionKind = "DAILY" | "SUBJECT";

export interface SchoolTerm {
  id: string;
  schoolId: number;
  schoolName: string;
  academicYear: number;
  semester: number;
  startsOn: string | null;
  endsOn: string | null;
  status: SchoolTermStatus;
  calendarDayCount: number;
  schoolDayCount: number;
}

export interface SchoolCalendarDay {
  id: string;
  termId: string;
  date: string;
  dayType: CalendarDayType;
  reason: string | null;
  source: "GENERATED" | "MANUAL" | "IMPORT" | "BACKFILL";
}

export interface AttendanceReconciliationItem {
  gradeLevelId: number;
  grade: string;
  room: number;
  expectedRosterCount: number;
  recordedCount: number;
  sessionId: string | null;
  sessionStatus: AttendanceSessionStatus | null;
  revision: number | null;
  operationalStatus: "COMPLETED" | "MISSING" | "INCOMPLETE";
}

export interface AttendanceReconciliationResponse {
  rows: AttendanceReconciliationItem[];
  totalCount: number;
  page: number;
  limit: number;
  dayType: CalendarDayType | null;
  summary: { completed: number; missing: number; incomplete: number };
}

export type AttendanceSessionAnomalyType =
  | "HOLIDAY_ATTENDANCE"
  | "CANCELLED_ATTENDANCE"
  | "OUT_OF_TERM"
  | "MISSING_CALENDAR_DAY";

export interface AttendanceSessionAnomalyItem {
  sessionId: string;
  date: string;
  gradeLevelId: number;
  grade: string;
  room: number;
  expectedRosterCount: number;
  recordedCount: number;
  sessionStatus: AttendanceSessionStatus;
  revision: number;
  dayType: CalendarDayType | null;
  calendarReason: string | null;
  anomalyType: AttendanceSessionAnomalyType;
}

export interface AttendanceSessionAnomaliesResponse {
  rows: AttendanceSessionAnomalyItem[];
  totalCount: number;
  page: number;
  limit: number;
  summary: {
    holidayAttendance: number;
    cancelledAttendance: number;
    outOfTerm: number;
    missingCalendarDay: number;
  };
}

export interface AttendanceTask {
  task_id: string;
  task_type: string;
  target_grade: string;
  target_room: string;
  target_school_id: string | number | null;
  target_school_name: string | null;
  link_assigned_to: string | null;
  link_assigned_to_email?: string | null;
  active_link: string | null;
  active_link_created_at?: string | null;
  active_link_expires_at?: string | null;
  active_link_locked: boolean;
  active_link_id: string | null;
  link_state?: Exclude<AttendanceTaskLinkStatus, "ALL"> | null;
  attendance_session_id?: string | null;
  attendance_session_status?: AttendanceSessionStatus | null;
  attendance_expected_roster_count?: number | string | null;
  attendance_recorded_count?: number | string | null;
  attendance_check_status?: "COMPLETED" | "NOT_CHECKED" | null;
  created_at: string;
}

export type AttendanceTaskLinkStatus =
  | "ALL"
  | "ACTIVE"
  | "LOCKED"
  | "EXPIRED"
  | "SCHEDULED";

export interface AttendanceTaskListQuery {
  page?: number;
  limit?: number;
  searchTerm?: string;
  status?: AttendanceTaskLinkStatus;
  province?: string;
  district?: string;
  subDistrict?: string;
  schoolId?: string | number;
  grade?: string;
  room?: string;
}

export interface AttendanceTaskSummary {
  total: number;
  active: number;
  locked: number;
  expired: number;
  scheduled: number;
}

export interface AttendanceTasksPageResponse {
  rows: AttendanceTask[];
  totalCount: number;
  page: number;
  limit: number;
  summary: AttendanceTaskSummary;
}

export type AttendanceClassStatus = "COMPLETED" | "PENDING";

/**
 * Derived per-class view for a given date. The legacy backend exposes no single
 * "class summary" endpoint, so this is composed client-side from the attendance
 * task list + that date's history records.
 */
export interface AttendanceClassSummary {
  id: string;
  grade: string;
  room: string;
  schoolId: string | number | null;
  schoolName: string | null;
  recordedCount: number;
  status: AttendanceClassStatus;
}
