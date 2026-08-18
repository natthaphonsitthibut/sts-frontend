import type { AttendanceImportHistoryEntry } from "../components/AttendanceImportHistoryTable";
import { apiClient } from "../../../lib/api-client";
import { normalizeAttendanceSelectionStatus } from "../lib/attendance-presentation";
import type { AttendanceImportSheet } from "../lib/attendance-import";
import type {
  AttendanceHistoryRecord,
  AttendanceReconciliationResponse,
  AttendanceMarksSaveResponse,
  AttendanceSaveRecord,
  AttendanceSaveResponse,
  AttendanceSessionKind,
  AttendanceSessionAnomaliesResponse,
  AttendanceStudent,
  AttendanceStudentQuery,
  AttendanceSessionContext,
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
  parseAttendanceImport: (input: {
    file?: File;
    url?: string;
  }) => Promise<AttendanceImportSheet>;
  getHistory: (
    date: string,
    schoolId?: string,
    options?: {
      sessionKind?: AttendanceSessionKind;
      timetableSlotId?: number | null;
    },
  ) => Promise<AttendanceHistoryRecord[]>;
  saveAttendance: (
    records: AttendanceSaveRecord[],
    options: { timetableSlotId: number; date?: string },
  ) => Promise<AttendanceSaveResponse>;
  saveAttendanceMarks: (
    records: AttendanceSaveRecord[],
    options: {
      timetableSlotId: number;
      date?: string;
      clearedStudentIds?: string[];
    },
  ) => Promise<AttendanceMarksSaveResponse>;
  getSessionContext: (query: {
    schoolId: string | number;
    grade: string;
    room: string | number;
    date: string;
    timetableSlotId: number;
  }) => Promise<AttendanceSessionContext>;
  reopenSession: (
    sessionId: string,
    reason: string,
  ) => Promise<AttendanceSessionContext["session"]>;
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
  options: {
    sessionKind?: AttendanceSessionKind;
    timetableSlotId?: number | null;
  } = {},
): Promise<AttendanceHistoryRecord[]> {
  const response = await apiClient.get<DataEnvelope<AttendanceHistoryRecord[]>>(
    "/attendance/history",
    {
      params: {
        date,
        ...(schoolId ? { schoolId } : {}),
        ...(options.sessionKind ? { sessionKind: options.sessionKind } : {}),
        ...(options.timetableSlotId
          ? { timetableSlotId: options.timetableSlotId }
          : {}),
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

async function saveAttendance(
  records: AttendanceSaveRecord[],
  options: { timetableSlotId: number; date?: string },
): Promise<AttendanceSaveResponse> {
  const response = await apiClient.post<AttendanceSaveResponse>("/attendance", {
    records,
    timetable_slot_id: options.timetableSlotId,
    ...(options.date ? { date: options.date } : {}),
  });
  return response.data;
}

/**
 * Autosave for a check-in in progress: sends only the students marked since the
 * last flush and leaves the round open. `saveAttendance` is what closes it.
 */
async function saveAttendanceMarks(
  records: AttendanceSaveRecord[],
  options: {
    timetableSlotId: number;
    date?: string;
    clearedStudentIds?: string[];
  },
): Promise<AttendanceMarksSaveResponse> {
  const response = await apiClient.post<AttendanceMarksSaveResponse>(
    "/attendance/marks",
    {
      records,
      ...(options.clearedStudentIds?.length
        ? { cleared_student_ids: options.clearedStudentIds }
        : {}),
      timetable_slot_id: options.timetableSlotId,
      ...(options.date ? { date: options.date } : {}),
    },
  );
  return response.data;
}

async function getSessionContext(query: {
  schoolId: string | number;
  grade: string;
  room: string | number;
  date: string;
  timetableSlotId: number;
}): Promise<AttendanceSessionContext> {
  const response = await apiClient.get<DataEnvelope<AttendanceSessionContext>>(
    "/attendance/session",
    { params: query },
  );
  return response.data.data;
}

async function reopenSession(
  sessionId: string,
  reason: string,
): Promise<AttendanceSessionContext["session"]> {
  const response = await apiClient.post<
    DataEnvelope<NonNullable<AttendanceSessionContext["session"]>>
  >(`/attendance/sessions/${encodeURIComponent(sessionId)}/reopen`, { reason });
  return response.data.data;
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

/**
 * Reads a spreadsheet server-side (the URL variant has to be fetched there, so
 * both inputs share one endpoint) and returns its raw header/row strings.
 */
async function parseAttendanceImport(input: {
  file?: File;
  url?: string;
}): Promise<AttendanceImportSheet> {
  const formData = new FormData();
  if (input.file) formData.append("file", input.file);
  if (input.url) formData.append("url", input.url);
  const response = await apiClient.post<DataEnvelope<AttendanceImportSheet>>(
    "/attendance/import/parse",
    formData,
  );
  return response.data.data;
}

export const attendanceService: AttendanceService = {
  getStudents,
  parseAttendanceImport,
  getHistory,
  saveAttendance,
  saveAttendanceMarks,
  getSessionContext,
  reopenSession,
  getTerms,
  upsertTerm,
  generateCalendar,
  getCalendar,
  updateCalendarDay,
  getReconciliation,
  getReconciliationAnomalies,
};

export interface AttendanceImportHistoryQuery {
  classroomId: number;
  /** Same subject filter the เช็กชื่อ tab uses. */
  subjectId?: number;
  page: number;
  limit: number;
  attendanceDate?: string;
  search?: string;
  sortBy?: "attendanceDate" | "importedBy" | "importedAt";
  sortDirection?: "asc" | "desc";
}

/** ประวัติ → นำเข้าไฟล์ for the staff screen. */
export async function listAttendanceImports(
  query: AttendanceImportHistoryQuery,
) {
  const response = await apiClient.get<{
    data: AttendanceImportHistoryEntry[];
    meta: { totalCount: number; totalPages: number };
  }>("/attendance/imports", { params: query });
  return response.data;
}

/** Opens the stored spreadsheet; the endpoint answers with the file itself. */
export async function openAttendanceImportFile(
  id: string,
  classroomId: number,
): Promise<Blob> {
  const response = await apiClient.get<Blob>(`/attendance/imports/${id}/file`, {
    params: { classroomId },
    responseType: "blob",
  });
  return response.data;
}

/** Records an applied import together with the file it came from. */
export async function recordAttendanceImport(input: {
  classroomId: number;
  attendanceDate: string;
  timetableSlotId?: number;
  subjectId?: number;
  fileName: string;
  sourceUrl?: string;
  rowCount: number;
  appliedCount: number;
  file?: File;
}): Promise<void> {
  const form = new FormData();
  if (input.file) form.append("file", input.file, input.fileName);
  // The server derives school and term from the classroom, so neither is sent.
  form.append("classroomId", String(input.classroomId));
  form.append("attendanceDate", input.attendanceDate);
  if (input.timetableSlotId) {
    form.append("timetableSlotId", String(input.timetableSlotId));
  }
  if (input.subjectId) form.append("subjectId", String(input.subjectId));
  form.append("fileName", input.fileName);
  if (input.sourceUrl) form.append("sourceUrl", input.sourceUrl);
  form.append("rowCount", String(input.rowCount));
  form.append("appliedCount", String(input.appliedCount));
  await apiClient.post("/attendance/imports", form);
}
