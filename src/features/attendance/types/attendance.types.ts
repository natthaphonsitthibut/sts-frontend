export type AttendanceSelectionStatus =
  | "P_PRESENT"
  | "P_ABSENT"
  | "P_LATE"
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
}

export interface AttendanceTask {
  task_id: string;
  task_type: string;
  target_grade: string;
  target_room: string;
  target_school_id: string | number | null;
  target_school_name: string | null;
  link_assigned_to: string | null;
  active_link: string | null;
  active_link_locked: boolean;
  active_link_id: string | null;
  created_at: string;
}

export type AttendanceTaskLinkStatus = "ALL" | "ACTIVE" | "LOCKED" | "EXPIRED";

export interface AttendanceTaskListQuery {
  page?: number;
  limit?: number;
  searchTerm?: string;
  status?: AttendanceTaskLinkStatus;
}

export interface AttendanceTaskSummary {
  total: number;
  active: number;
  locked: number;
  expired: number;
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
