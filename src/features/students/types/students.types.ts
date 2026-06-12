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
}

export interface StudentDetail extends Record<string, unknown> {
  PersonID_Onec: string;
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
