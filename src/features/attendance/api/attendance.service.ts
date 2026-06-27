import { apiClient } from "../../../lib/api-client";
import {
  DEFAULT_PAGE_SIZE,
  toPaginationParams,
} from "../../../lib/pagination";
import { normalizeAttendanceSelectionStatus } from "../lib/attendance-presentation";
import type {
  AttendanceHistoryRecord,
  AttendanceSaveRecord,
  AttendanceSaveResponse,
  AttendanceStudent,
  AttendanceStudentQuery,
  AttendanceTask,
  AttendanceTaskLinkStatus,
  AttendanceTaskListQuery,
  AttendanceTasksPageResponse,
} from "../types/attendance.types";

interface DataEnvelope<T> {
  data: T;
}

interface AttendanceService {
  getStudents: (query: AttendanceStudentQuery) => Promise<AttendanceStudent[]>;
  getHistory: (date: string, schoolId?: string) => Promise<AttendanceHistoryRecord[]>;
  getTasks: () => Promise<AttendanceTask[]>;
  getAttendanceTasksPage: (
    query?: AttendanceTaskListQuery,
  ) => Promise<AttendanceTasksPageResponse>;
  saveAttendance: (
    records: AttendanceSaveRecord[],
  ) => Promise<AttendanceSaveResponse>;
}

const ATTENDANCE_TASK_TYPE = "ATTENDANCE";
// Must be one of the backend-accepted page sizes (PAGE_SIZES = 10/20/50);
// getTasks() pages through with this to rebuild the full legacy array.
const LEGACY_TASK_PAGE_SIZE = 50;

function isAttendanceTask(task: AttendanceTask): boolean {
  return task.task_type === ATTENDANCE_TASK_TYPE;
}

function getTaskLinkState(
  task: AttendanceTask,
): Exclude<AttendanceTaskLinkStatus, "ALL"> {
  if (task.active_link_locked) return "LOCKED";
  if (!task.active_link) return "EXPIRED";
  return "ACTIVE";
}

function buildTaskSummary(tasks: AttendanceTask[]) {
  return {
    total: tasks.length,
    active: tasks.filter((task) => getTaskLinkState(task) === "ACTIVE").length,
    locked: tasks.filter((task) => getTaskLinkState(task) === "LOCKED").length,
    expired: tasks.filter((task) => getTaskLinkState(task) === "EXPIRED").length,
  };
}

function filterLegacyTasks(
  tasks: AttendanceTask[],
  query: AttendanceTaskListQuery,
): AttendanceTask[] {
  const searchTerm = query.searchTerm?.trim().toLowerCase();

  return tasks.filter((task) => {
    if (!isAttendanceTask(task)) return false;
    if (query.status && query.status !== "ALL" && getTaskLinkState(task) !== query.status) {
      return false;
    }
    if (!searchTerm) return true;

    return [
      task.target_grade,
      task.target_room,
      task.target_school_name,
      task.link_assigned_to,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(searchTerm);
  });
}

function normalizeAttendanceTasksPageResponse(
  body: AttendanceTask[] | Partial<AttendanceTasksPageResponse> | null | undefined,
  query: AttendanceTaskListQuery = {},
): AttendanceTasksPageResponse {
  const page = query.page ?? 1;
  const limit = query.limit ?? DEFAULT_PAGE_SIZE;

  if (Array.isArray(body)) {
    const filteredRows = filterLegacyTasks(body, query);
    const start = (page - 1) * limit;
    const rows = filteredRows.slice(start, start + limit);
    return {
      rows,
      totalCount: filteredRows.length,
      page,
      limit,
      summary: buildTaskSummary(filteredRows),
    };
  }

  const rows = Array.isArray(body?.rows) ? body.rows : [];
  return {
    rows,
    totalCount: body?.totalCount ?? rows.length,
    page: body?.page ?? page,
    limit: body?.limit ?? limit,
    summary: {
      ...buildTaskSummary(rows),
      ...body?.summary,
    },
  };
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
    { params: { date, ...(schoolId ? { schoolId } : {}) } },
  );

  return (response.data.data || []).map((record) => ({
    ...record,
    id: String(record.student_id || record.id || ""),
    name: record.name || record.student_name || "",
    status: normalizeAttendanceSelectionStatus(record.status),
    recorded_by: record.RecordedBy || record.recorded_by || "Admin",
  }));
}

async function getTasks(): Promise<AttendanceTask[]> {
  const firstPage = await getAttendanceTasksPage({
    page: 1,
    limit: LEGACY_TASK_PAGE_SIZE,
    status: "ALL",
  });
  const firstRows = firstPage.rows.filter(isAttendanceTask);
  const totalPages =
    firstPage.limit > 0 ? Math.ceil(firstPage.totalCount / firstPage.limit) : 1;

  if (totalPages <= 1) {
    return firstRows;
  }

  const remainingPages = await Promise.all(
    Array.from({ length: totalPages - 1 }, (_, index) =>
      getAttendanceTasksPage({
        page: index + 2,
        limit: firstPage.limit,
        status: "ALL",
      }),
    ),
  );

  return [
    ...firstRows,
    ...remainingPages.flatMap((page) => page.rows.filter(isAttendanceTask)),
  ];
}

async function getAttendanceTasksPage(
  query: AttendanceTaskListQuery = {},
): Promise<AttendanceTasksPageResponse> {
  const params: Record<string, string> = toPaginationParams(query);
  params.status = query.status ?? "ALL";

  const searchTerm = query.searchTerm?.trim();
  if (searchTerm) {
    params.searchTerm = searchTerm;
  }

  const response = await apiClient.get<
    AttendanceTasksPageResponse | AttendanceTask[]
  >("/attendance/tasks", { params });

  return normalizeAttendanceTasksPageResponse(response.data, query);
}

async function saveAttendance(
  records: AttendanceSaveRecord[],
): Promise<AttendanceSaveResponse> {
  const response = await apiClient.post<AttendanceSaveResponse>(
    "/attendance",
    { records },
  );
  return response.data;
}

export const attendanceService: AttendanceService = {
  getStudents,
  getHistory,
  getTasks,
  getAttendanceTasksPage,
  saveAttendance,
};
