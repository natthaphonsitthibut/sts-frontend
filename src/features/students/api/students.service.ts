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
  StudentUpdatePayload,
  CreatePiiExportRequestPayload,
  PiiExportDownloadResult,
  PiiExportRequestListQuery,
  PiiExportRequestListResult,
  PiiExportRequestResponse,
  RejectPiiExportRequestPayload,
} from "../types/students.types";

interface DataEnvelope<T> {
  data?: T;
  meta?: PaginationMeta;
}

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const STUDENT_ATTENDANCE_STATUS_CODE = {
  PRESENT: 1,
  ABSENT: 2,
  LATE: 3,
  LEAVE: 4,
} as const;
const STUDENT_ATTENDANCE_STATUS_ALIASES = [
  {
    normalized: "PRESENT",
    values: [
      STUDENT_ATTENDANCE_STATUS_CODE.PRESENT,
      String(STUDENT_ATTENDANCE_STATUS_CODE.PRESENT),
      "P_PRESENT",
      "PRESENT",
    ],
  },
  {
    normalized: "ABSENT",
    values: [
      STUDENT_ATTENDANCE_STATUS_CODE.ABSENT,
      String(STUDENT_ATTENDANCE_STATUS_CODE.ABSENT),
      "P_ABSENT",
      "ABSENT",
    ],
  },
  {
    normalized: "LATE",
    values: [
      STUDENT_ATTENDANCE_STATUS_CODE.LATE,
      String(STUDENT_ATTENDANCE_STATUS_CODE.LATE),
      "P_LATE",
      "LATE",
    ],
  },
  {
    normalized: "LEAVE",
    values: [
      STUDENT_ATTENDANCE_STATUS_CODE.LEAVE,
      String(STUDENT_ATTENDANCE_STATUS_CODE.LEAVE),
      "P_LEAVE",
      "LEAVE",
    ],
  },
] as const;

interface StudentsService {
  getStudents: (query?: StudentListQuery) => Promise<StudentListResult>;
  getFilterOptions: (
    query?: Pick<
      StudentListQuery,
      | "schoolId"
      | "province"
      | "district"
      | "subDistrict"
      | "grade"
      | "studentStatusCode"
      | "enrollmentState"
    >,
  ) => Promise<StudentFilterOptions>;
  getStudentById: (studentId: string) => Promise<StudentDetail>;
  revealStudentPii: (
    studentId: string,
    payload: StudentPiiRevealRequest,
  ) => Promise<StudentPiiRevealResponse>;
  listPiiExportRequests: (
    query?: PiiExportRequestListQuery,
  ) => Promise<PiiExportRequestListResult>;
  createPiiExportRequest: (
    payload: CreatePiiExportRequestPayload,
  ) => Promise<PiiExportRequestResponse>;
  approvePiiExportRequest: (id: string) => Promise<PiiExportRequestResponse>;
  rejectPiiExportRequest: (
    payload: RejectPiiExportRequestPayload,
  ) => Promise<PiiExportRequestResponse>;
  downloadPiiExportCsv: (token: string) => Promise<PiiExportDownloadResult>;
  updateStudent: (studentId: string, payload: StudentUpdatePayload) => Promise<StudentDetail>;
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
  const province = query.province?.trim();
  if (province) {
    params.province = province;
  }
  const district = query.district?.trim();
  if (district) {
    params.district = district;
  }
  const subDistrict = query.subDistrict?.trim();
  if (subDistrict) {
    params.subDistrict = subDistrict;
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
  if (query.enrollmentState) {
    params.enrollmentState = query.enrollmentState;
  }
  if (query.studentStatusCode && query.studentStatusCode !== "ALL") {
    params.student_status_code = query.studentStatusCode;
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
  return (
    STUDENT_ATTENDANCE_STATUS_ALIASES.find((alias) =>
      alias.values.some((value) => value === status),
    )?.normalized ?? "UNKNOWN"
  );
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
      totalPages:
        meta?.totalPages ?? (limit > 0 ? Math.ceil(totalCount / limit) : 0),
    },
  };
}

async function getFilterOptions(
  query: Pick<
    StudentListQuery,
    | "schoolId"
    | "province"
    | "district"
    | "subDistrict"
    | "grade"
    | "studentStatusCode"
    | "enrollmentState"
  > = {},
): Promise<StudentFilterOptions> {
  const params: Record<string, string> = {};
  const schoolId = query.schoolId?.trim();
  if (schoolId) {
    params.schoolId = schoolId;
  }
  const province = query.province?.trim();
  if (province) {
    params.province = province;
  }
  const district = query.district?.trim();
  if (district) {
    params.district = district;
  }
  const subDistrict = query.subDistrict?.trim();
  if (subDistrict) {
    params.subDistrict = subDistrict;
  }
  if (query.grade && query.grade !== "ALL") {
    params.grade = query.grade;
  }
  if (query.enrollmentState) {
    params.enrollmentState = query.enrollmentState;
  }
  if (query.studentStatusCode && query.studentStatusCode !== "ALL") {
    params.student_status_code = query.studentStatusCode;
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
  const response = await apiClient.get<StudentDetail>(`/students/${studentId}`);
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

function buildPiiExportRequestParams(
  query: PiiExportRequestListQuery = {},
): Record<string, string> {
  const params: Record<string, string> = {};
  if (query.status) {
    params.status = query.status;
  }
  if (typeof query.page === "number") {
    params.page = String(query.page);
  }
  if (typeof query.limit === "number") {
    params.limit = String(query.limit);
  }
  return params;
}

async function listPiiExportRequests(
  query: PiiExportRequestListQuery = {},
): Promise<PiiExportRequestListResult> {
  const response = await apiClient.get<PiiExportRequestListResult>(
    "/students/pii-export-requests",
    { params: buildPiiExportRequestParams(query) },
  );
  return response.data;
}

async function createPiiExportRequest(
  payload: CreatePiiExportRequestPayload,
): Promise<PiiExportRequestResponse> {
  const response = await apiClient.post<PiiExportRequestResponse>(
    "/students/pii-export-requests",
    payload,
  );
  return response.data;
}

async function approvePiiExportRequest(id: string): Promise<PiiExportRequestResponse> {
  const response = await apiClient.post<PiiExportRequestResponse>(
    `/students/pii-export-requests/${id}/approve`,
  );
  return response.data;
}

async function rejectPiiExportRequest(
  payload: RejectPiiExportRequestPayload,
): Promise<PiiExportRequestResponse> {
  const response = await apiClient.post<PiiExportRequestResponse>(
    `/students/pii-export-requests/${payload.id}/reject`,
    { rejected_reason: payload.rejected_reason },
  );
  return response.data;
}

function getPiiExportFilename(contentDisposition: string | undefined): string {
  const match = contentDisposition?.match(/filename="?([^"]+)"?/i);
  return match?.[1] ?? "pii-export.csv";
}

async function downloadPiiExportCsv(token: string): Promise<PiiExportDownloadResult> {
  const response = await apiClient.get<Blob>("/students/pii-export-download", {
    params: { token },
    responseType: "blob",
  });
  return {
    blob: response.data,
    filename: getPiiExportFilename(response.headers["content-disposition"]),
  };
}

async function updateStudent(
  studentId: string,
  payload: StudentUpdatePayload,
): Promise<StudentDetail> {
  const response = await apiClient.patch<StudentDetail>(`/students/${studentId}`, payload);
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
  listPiiExportRequests,
  createPiiExportRequest,
  approvePiiExportRequest,
  rejectPiiExportRequest,
  downloadPiiExportCsv,
  updateStudent,
  getStudentCasesByName,
  getStudentAttendance,
  getStudentAttendanceSummary,
};
