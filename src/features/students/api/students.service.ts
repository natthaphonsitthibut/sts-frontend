import { apiClient } from "../../../lib/api-client";
import type {
  StudentAttendanceCalendarRecord,
  StudentAttendanceSummaryResponse,
  StudentCase,
  StudentDetail,
  StudentListItem,
  StudentListQuery,
} from "../types/students.types";

interface DataEnvelope<T> {
  data?: T;
}

interface StudentsService {
  getStudents: (query?: StudentListQuery) => Promise<StudentListItem[]>;
  getStudentById: (studentId: string) => Promise<StudentDetail>;
  getStudentCasesByName: (studentName: string) => Promise<StudentCase[]>;
  getStudentAttendance: (
    studentId: string,
  ) => Promise<StudentAttendanceCalendarRecord[]>;
  getStudentAttendanceSummary: (
    studentId: string,
  ) => Promise<StudentAttendanceSummaryResponse>;
}

function normalizeArrayResponse<T>(
  data: T[] | DataEnvelope<T[]> | null | undefined,
): T[] {
  if (Array.isArray(data)) {
    return data;
  }
  if (Array.isArray(data?.data)) {
    return data.data;
  }
  return [];
}

function buildStudentListParams(
  query: StudentListQuery,
): Record<string, string> {
  const params: Record<string, string> = {};
  const schoolId = query.schoolId?.trim();
  if (schoolId) {
    params.schoolId = schoolId;
  }
  if (query.grade && query.grade !== "ALL") {
    params.grade = query.grade;
  }
  if (query.room && query.room !== "ALL") {
    params.room = query.room;
  }
  const searchTerm = query.searchTerm?.trim();
  if (searchTerm) {
    params.searchTerm = searchTerm;
  }
  return params;
}

function normalizeAttendanceStatus(status: unknown): string {
  if (
    status === 1 ||
    status === "1" ||
    status === "P_PRESENT" ||
    status === "PRESENT"
  ) {
    return "PRESENT";
  }
  if (
    status === 2 ||
    status === "2" ||
    status === "P_ABSENT" ||
    status === "ABSENT"
  ) {
    return "ABSENT";
  }
  if (
    status === 3 ||
    status === "3" ||
    status === "P_LATE" ||
    status === "LATE"
  ) {
    return "LATE";
  }
  if (
    status === 4 ||
    status === "4" ||
    status === "P_LEAVE" ||
    status === "LEAVE"
  ) {
    return "LEAVE";
  }
  return "UNKNOWN";
}

async function getStudents(
  query: StudentListQuery = {},
): Promise<StudentListItem[]> {
  const params = buildStudentListParams(query);
  const response = await apiClient.get<
    StudentListItem[] | DataEnvelope<StudentListItem[]>
  >("/api/students", { params });
  return normalizeArrayResponse(response.data);
}

async function getStudentById(studentId: string): Promise<StudentDetail> {
  const response = await apiClient.get<StudentDetail>(
    `/api/students/${studentId}`,
  );
  return response.data;
}

async function getStudentCasesByName(
  studentName: string,
): Promise<StudentCase[]> {
  const response = await apiClient.get<
    StudentCase[] | DataEnvelope<StudentCase[]>
  >(`/api/students/cases/by-name/${encodeURIComponent(studentName)}`);
  return normalizeArrayResponse(response.data);
}

async function getStudentAttendance(
  studentId: string,
): Promise<StudentAttendanceCalendarRecord[]> {
  const response = await apiClient.get<
    | StudentAttendanceCalendarRecord[]
    | DataEnvelope<StudentAttendanceCalendarRecord[]>
  >(`/api/students/attendance/${studentId}`);
  return normalizeArrayResponse(response.data);
}

async function getStudentAttendanceSummary(
  studentId: string,
): Promise<StudentAttendanceSummaryResponse> {
  const records = await getStudentAttendance(studentId);

  const summaryRecords = records.map((record, index) => ({
    id: `${record.date}-${record.period ?? index}`,
    date: record.date,
    status: normalizeAttendanceStatus(record.status),
  }));

  const stats = summaryRecords.reduce<StudentAttendanceSummaryResponse["stats"]>(
    (acc, record) => {
      if (record.status === "PRESENT") {
        acc.present += 1;
      } else if (record.status === "ABSENT") {
        acc.absent += 1;
      } else if (record.status === "LATE") {
        acc.late += 1;
      }
      acc.total += 1;
      return acc;
    },
    { present: 0, absent: 0, late: 0, total: 0 },
  );

  return { records: summaryRecords, stats };
}

export const studentsService: StudentsService = {
  getStudents,
  getStudentById,
  getStudentCasesByName,
  getStudentAttendance,
  getStudentAttendanceSummary,
};
