import { apiClient } from "../../../lib/api-client";
import { normalizeAttendanceSelectionStatus } from "../lib/attendance-presentation";
import type {
  AttendanceHistoryRecord,
  AttendanceStudent,
  AttendanceStudentQuery,
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
    termId?: string;
    schoolId: number;
    academicYear: number;
    semester: number;
    startsOn: string;
    endsOn: string;
    status: SchoolTermStatus;
  }) => Promise<SchoolTerm>;
  deleteTerm: (termId: string) => Promise<string>;
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
  termId?: string;
  schoolId: number;
  academicYear: number;
  semester: number;
  startsOn: string;
  endsOn: string;
  status: SchoolTermStatus;
}): Promise<SchoolTerm> {
  const { termId, ...rest } = input;
  const response = await apiClient.post<DataEnvelope<SchoolTerm>>(
    "/attendance/terms",
    // Editing sends the row id so a changed year or semester rewrites the term
    // the user opened instead of creating a second one beside it.
    termId ? { ...rest, termId: Number(termId) } : rest,
  );
  return response.data.data;
}

async function deleteTerm(termId: string): Promise<string> {
  const response = await apiClient.delete<DataEnvelope<{ id: string }>>(
    `/attendance/terms/${encodeURIComponent(termId)}`,
  );
  return response.data.data.id;
}

export const attendanceService: AttendanceService = {
  getStudents,
  getHistory,
  getTerms,
  upsertTerm,
  deleteTerm,
};
