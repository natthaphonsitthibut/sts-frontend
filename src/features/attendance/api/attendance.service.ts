import { apiClient } from "../../../lib/api-client";
import { normalizeAttendanceSelectionStatus } from "../lib/attendance-presentation";
import type {
  AttendanceHistoryRecord,
  AttendanceSaveRecord,
  AttendanceSaveResponse,
  AttendanceStudent,
  AttendanceStudentQuery,
  AttendanceTask,
} from "../types/attendance.types";

interface DataEnvelope<T> {
  data: T;
}

interface AttendanceService {
  getStudents: (query: AttendanceStudentQuery) => Promise<AttendanceStudent[]>;
  getHistory: (date: string, schoolId?: string) => Promise<AttendanceHistoryRecord[]>;
  getTasks: () => Promise<AttendanceTask[]>;
  saveAttendance: (
    records: AttendanceSaveRecord[],
  ) => Promise<AttendanceSaveResponse>;
}

async function getStudents(
  query: AttendanceStudentQuery,
): Promise<AttendanceStudent[]> {
  const response = await apiClient.get<DataEnvelope<AttendanceStudent[]>>(
    "/api/attendance/students",
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
    "/api/attendance/history",
    { params: { date, ...(schoolId ? { schoolId } : {}) } },
  );

  return (response.data.data || []).map((record) => ({
    ...record,
    id: String(record.PersonID_Onec || record.student_id || record.id || ""),
    name: record.name || record.student_name || "",
    status: normalizeAttendanceSelectionStatus(record.status),
    recorded_by: record.RecordedBy || record.recorded_by || "Admin",
  }));
}

async function getTasks(): Promise<AttendanceTask[]> {
  const response = await apiClient.get<AttendanceTask[]>("/api/attendance/tasks");
  return (response.data || []).filter(
    (task) => task.task_type === "ATTENDANCE",
  );
}

async function saveAttendance(
  records: AttendanceSaveRecord[],
): Promise<AttendanceSaveResponse> {
  const response = await apiClient.post<AttendanceSaveResponse>(
    "/api/attendance",
    { records },
  );
  return response.data;
}

export const attendanceService: AttendanceService = {
  getStudents,
  getHistory,
  getTasks,
  saveAttendance,
};
