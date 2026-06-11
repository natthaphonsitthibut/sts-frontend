import { apiClient } from "../../../lib/api-client";
import { normalizeAttendanceSelectionStatus } from "../lib/attendance-presentation";
import type {
  AttendanceClassSummary,
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
  getHistory: (date: string) => Promise<AttendanceHistoryRecord[]>;
  getTasks: () => Promise<AttendanceTask[]>;
  getDailyClassSummaries: (date: string) => Promise<AttendanceClassSummary[]>;
  saveAttendance: (
    records: AttendanceSaveRecord[],
  ) => Promise<AttendanceSaveResponse>;
}

function matchesClass(
  record: AttendanceHistoryRecord,
  task: AttendanceTask,
): boolean {
  const gradeMatch = String(record.grade) === String(task.target_grade);
  const roomMatch = String(record.room) === String(task.target_room);

  if (task.target_school_id != null && record.school_id != null) {
    return (
      gradeMatch &&
      roomMatch &&
      String(record.school_id) === String(task.target_school_id)
    );
  }

  return gradeMatch && roomMatch;
}

function summarizeClasses(
  tasks: AttendanceTask[],
  history: AttendanceHistoryRecord[],
): AttendanceClassSummary[] {
  return tasks.map((task) => {
    const recordedCount = history.filter((record) =>
      matchesClass(record, task),
    ).length;

    return {
      id: task.task_id,
      grade: task.target_grade,
      room: task.target_room,
      schoolId: task.target_school_id,
      schoolName: task.target_school_name,
      recordedCount,
      status: recordedCount > 0 ? "COMPLETED" : "PENDING",
    };
  });
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

async function getHistory(date: string): Promise<AttendanceHistoryRecord[]> {
  const response = await apiClient.get<DataEnvelope<AttendanceHistoryRecord[]>>(
    "/api/attendance/history",
    { params: { date } },
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

async function getDailyClassSummaries(
  date: string,
): Promise<AttendanceClassSummary[]> {
  const [tasks, history] = await Promise.all([getTasks(), getHistory(date)]);
  return summarizeClasses(tasks, history);
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
  getDailyClassSummaries,
  saveAttendance,
};
