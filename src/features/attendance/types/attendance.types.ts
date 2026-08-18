export type AttendanceSelectionStatus =
  | "P_PRESENT"
  | "P_ABSENT"
  | "P_LATE"
  | "P_LEAVE"
  | "NONE";

export interface AttendanceStudent {
  id: string;
  name: string;
  first_name?: string | null;
  last_name?: string | null;
  grade: string;
  room: string;
  school_id?: string | number;
  /** Needed to file a homeroom comment against the right classroom. */
  classroom_id?: number | string | null;
  school_name?: string;
  student_number?: string | null;
  photo_url?: string | null;
  risk_tier?: string | null;
  /** Latest homeroom note, shown as หมายเหตุ. */
  teacher_comment?: string | null;
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
  /** When the teacher tapped this status; null for rows recorded before it existed. */
  marked_at?: string | null;
}

export interface AttendanceSaveRecord {
  student_id: string;
  status: AttendanceSelectionStatus;
  /** When the teacher tapped this status, ISO 8601; server clamps it. */
  marked_at?: string | null;
}

/** One student's mark held locally while a check-in is in progress. */
export interface AttendanceMark {
  status: Exclude<AttendanceSelectionStatus, "NONE">;
  markedAt: string;
}

export interface AttendanceMarksSaveResponse {
  session: { id: string; status: AttendanceSessionStatus; revision: number };
  expectedRosterCount: number;
  recordedCount: number;
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

export type AttendanceSessionKind = "SUBJECT";

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
