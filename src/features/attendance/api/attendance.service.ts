import { apiClient } from "../../../lib/api-client";
import { normalizeAttendanceSelectionStatus } from "../lib/attendance-presentation";
import type {
  AttendanceHistoryRecord,
  AttendanceReconciliationResponse,
  AttendanceSessionAnomaliesResponse,
  AttendanceStudent,
  AttendanceStudentQuery,
  CalendarDayType,
  SchoolCalendarDay,
  SchoolTerm,
  SchoolTermStatus,
} from "../types/attendance.types";

interface DataEnvelope<T> {
  data: T;
}

interface AttendanceService {
  getStudents: (query: AttendanceStudentQuery) => Promise<AttendanceStudent[]>;
  getHistory: (
    date: string,
    schoolId?: string,
  ) => Promise<AttendanceHistoryRecord[]>;
  getTerms: (schoolId: string | number) => Promise<SchoolTerm[]>;
  upsertTerm: (input: {
    schoolId: number;
    academicYear: number;
    semester: number;
    startsOn: string;
    endsOn: string;
    status: SchoolTermStatus;
  }) => Promise<SchoolTerm>;
  generateCalendar: (
    termId: string,
    schoolDays: number[],
  ) => Promise<SchoolCalendarDay[]>;
  getCalendar: (termId: string) => Promise<SchoolCalendarDay[]>;
  updateCalendarDay: (
    calendarDayId: string,
    input: { dayType: CalendarDayType; reason?: string },
  ) => Promise<SchoolCalendarDay>;
  getReconciliation: (query: {
    termId: string;
    date: string;
    page?: number;
    limit?: number;
    gradeLevelId?: number;
    room?: number;
  }) => Promise<AttendanceReconciliationResponse>;
  getReconciliationAnomalies: (query: {
    termId: string;
    page?: number;
    limit?: number;
    gradeLevelId?: number;
    room?: number;
  }) => Promise<AttendanceSessionAnomaliesResponse>;
}

async function getStudents(
  query: AttendanceStudentQuery,
): Promise<AttendanceStudent[]> {
  const response = await apiClient.get<DataEnvelope<AttendanceStudent[]>>(
    "/attendance/students",
    {
      params: {
        grade: query.grade,
        room: query.room,
        schoolId: query.schoolId,
      },
    },
  );
  return response.data.data || [];
}

async function getHistory(
  date: string,
  schoolId?: string,
): Promise<AttendanceHistoryRecord[]> {
  const response = await apiClient.get<DataEnvelope<AttendanceHistoryRecord[]>>(
    "/attendance/history",
    {
      params: {
        date,
        ...(schoolId ? { schoolId } : {}),
      },
    },
  );

  return (response.data.data || []).map((record) => ({
    ...record,
    id: String(record.student_id || record.id || ""),
    name: record.name || record.student_name || "",
    status: normalizeAttendanceSelectionStatus(record.status),
    recorded_by: record.RecordedBy || record.recorded_by || "Admin",
  }));
}

async function getTerms(schoolId: string | number): Promise<SchoolTerm[]> {
  const response = await apiClient.get<DataEnvelope<SchoolTerm[]>>(
    "/attendance/terms",
    { params: { schoolId } },
  );
  return response.data.data || [];
}

async function upsertTerm(input: {
  schoolId: number;
  academicYear: number;
  semester: number;
  startsOn: string;
  endsOn: string;
  status: SchoolTermStatus;
}): Promise<SchoolTerm> {
  const response = await apiClient.post<DataEnvelope<SchoolTerm>>(
    "/attendance/terms",
    input,
  );
  return response.data.data;
}

async function generateCalendar(
  termId: string,
  schoolDays: number[],
): Promise<SchoolCalendarDay[]> {
  const response = await apiClient.post<DataEnvelope<SchoolCalendarDay[]>>(
    `/attendance/terms/${encodeURIComponent(termId)}/calendar/generate`,
    { schoolDays },
  );
  return response.data.data || [];
}

async function getCalendar(termId: string): Promise<SchoolCalendarDay[]> {
  const response = await apiClient.get<DataEnvelope<SchoolCalendarDay[]>>(
    "/attendance/calendar",
    { params: { termId } },
  );
  return response.data.data || [];
}

async function updateCalendarDay(
  calendarDayId: string,
  input: { dayType: CalendarDayType; reason?: string },
): Promise<SchoolCalendarDay> {
  const response = await apiClient.patch<DataEnvelope<SchoolCalendarDay>>(
    `/attendance/calendar-days/${encodeURIComponent(calendarDayId)}`,
    input,
  );
  return response.data.data;
}

async function getReconciliation(query: {
  termId: string;
  date: string;
  page?: number;
  limit?: number;
}): Promise<AttendanceReconciliationResponse> {
  const response = await apiClient.get<AttendanceReconciliationResponse>(
    "/attendance/reconciliation",
    { params: query },
  );
  return response.data;
}

async function getReconciliationAnomalies(query: {
  termId: string;
  page?: number;
  limit?: number;
}): Promise<AttendanceSessionAnomaliesResponse> {
  const response = await apiClient.get<AttendanceSessionAnomaliesResponse>(
    "/attendance/reconciliation/anomalies",
    { params: query },
  );
  return response.data;
}

export const attendanceService: AttendanceService = {
  getStudents,
  getHistory,
  getTerms,
  upsertTerm,
  generateCalendar,
  getCalendar,
  updateCalendarDay,
  getReconciliation,
  getReconciliationAnomalies,
};
