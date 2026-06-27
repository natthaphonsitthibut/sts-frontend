import { apiClient } from "../../../lib/api-client";
import type {
  PaginationMeta,
  StudentAttendanceCalendarRecord,
  StudentAttendanceSummaryResponse,
  StudentCase,
  StudentDetail,
  StudentFilterOptions,
  StudentPiiRevealRequest,
  StudentPiiRevealResponse,
  StudentListItem,
  StudentListQuery,
  StudentListResult,
} from "../types/students.types";

interface DataEnvelope<T> {
  data?: T;
  meta?: PaginationMeta;
}

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;

interface StudentsService {
  getStudents: (query?: StudentListQuery) => Promise<StudentListResult>;
  getFilterOptions: (
    query?: Pick<StudentListQuery, "schoolId" | "grade">,
  ) => Promise<StudentFilterOptions>;
  getStudentById: (studentId: string) => Promise<StudentDetail>;
  revealStudentPii: (
    studentId: string,
    payload: StudentPiiRevealRequest,
  ) => Promise<StudentPiiRevealResponse>;
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
  if (typeof query.page === "number") {
    params.page = String(query.page);
  }
  if (typeof query.limit === "number") {
    params.limit = String(query.limit);
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
): Promise<StudentListResult> {
  const params = buildStudentListParams(query);
  const response = await apiClient.get<
    StudentListItem[] | DataEnvelope<StudentListItem[]>
  >("/students", { params });

  const items = normalizeArrayResponse(response.data);
  const meta = Array.isArray(response.data) ? undefined : response.data?.meta;
  const limit = meta?.limit ?? query.limit ?? DEFAULT_LIMIT;
  const page = meta?.page ?? query.page ?? DEFAULT_PAGE;
  const totalCount = meta?.totalCount ?? items.length;

  return {
    items,
    meta: {
      page,
      limit,
      totalCount,
      totalPages: meta?.totalPages ?? (limit > 0 ? Math.ceil(totalCount / limit) : 0),
    },
  };
}

async function getFilterOptions(
  query: Pick<StudentListQuery, "schoolId" | "grade"> = {},
): Promise<StudentFilterOptions> {
  const params: Record<string, string> = {};
  const schoolId = query.schoolId?.trim();
  if (schoolId) {
    params.schoolId = schoolId;
  }
  if (query.grade && query.grade !== "ALL") {
    params.grade = query.grade;
  }

  const response = await apiClient.get<DataEnvelope<StudentFilterOptions>>(
    "/students/filter-options",
    { params },
  );

  return {
    grades: response.data?.data?.grades ?? [],
    rooms: response.data?.data?.rooms ?? [],
  };
}

async function getStudentById(studentId: string): Promise<StudentDetail> {
  const response = await apiClient.get<StudentDetail>(
    `/students/${studentId}`,
  );
  return response.data;
}

async function revealStudentPii(
  studentId: string,
  payload: StudentPiiRevealRequest,
): Promise<StudentPiiRevealResponse> {
  const response = await apiClient.post<StudentPiiRevealResponse>(
    `/students/${studentId}/pii-reveal`,
    payload,
  );
  return response.data;
}

async function getStudentCasesByName(
  studentName: string,
): Promise<StudentCase[]> {
  const response = await apiClient.get<
    StudentCase[] | DataEnvelope<StudentCase[]>
  >(`/students/cases/by-name/${encodeURIComponent(studentName)}`);
  return normalizeArrayResponse(response.data);
}

async function getStudentAttendance(
  studentId: string,
): Promise<StudentAttendanceCalendarRecord[]> {
  const response = await apiClient.get<
    | StudentAttendanceCalendarRecord[]
    | DataEnvelope<StudentAttendanceCalendarRecord[]>
  >(`/students/attendance/${studentId}`);
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

  const stats = summaryRecords.reduce<
    StudentAttendanceSummaryResponse["stats"]
  >(
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
  getFilterOptions,
  getStudentById,
  revealStudentPii,
  getStudentCasesByName,
  getStudentAttendance,
  getStudentAttendanceSummary,
};
