import { apiClient } from "../../../lib/api-client";
import type {
  AttendanceTaskStatus,
  TaskAccessTask,
  TaskChainResponse,
  TaskCreatePayload,
  TaskCreateResponse,
  TaskDelegationPayload,
  TaskDelegationResponse,
  TaskGuestStudent,
  TaskHistoryEntry,
  TaskOtpChallenge,
  TaskSubmitResponse,
  VisitAssignee,
} from "../types/task.types";

interface DataEnvelope<T> {
  data?: T;
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

function createMagicSessionConfig(magicSessionToken?: string) {
  if (!magicSessionToken) {
    return undefined;
  }
  return { headers: { "x-magic-session": magicSessionToken } };
}

async function createTask(payload: TaskCreatePayload): Promise<TaskCreateResponse> {
  const response = await apiClient.post<TaskCreateResponse>("/tasks", payload);
  return response.data;
}

async function getVisitAssignees(studentId: string): Promise<VisitAssignee[]> {
  const response = await apiClient.get<DataEnvelope<VisitAssignee[]>>(
    `/tasks/visit-assignees/${encodeURIComponent(studentId)}`,
  );
  return response.data.data ?? [];
}

async function getTaskChain(taskId: string): Promise<TaskChainResponse> {
  const response = await apiClient.get<TaskChainResponse>(
    `/tasks/${encodeURIComponent(taskId)}/chain`,
  );
  return response.data;
}

async function getTask(
  token: string,
  magicSessionToken?: string,
): Promise<TaskAccessTask> {
  const response = await apiClient.get<TaskAccessTask>(
    `/tasks/${encodeURIComponent(token)}`,
    createMagicSessionConfig(magicSessionToken),
  );
  return response.data;
}

async function getTaskStudents(token: string): Promise<TaskGuestStudent[]> {
  const response = await apiClient.get<
    TaskGuestStudent[] | DataEnvelope<TaskGuestStudent[]>
  >(`/tasks/${encodeURIComponent(token)}/students`);
  return normalizeArrayResponse(response.data);
}

async function getTaskHistory(
  token: string,
  date: string,
): Promise<TaskHistoryEntry[]> {
  const response = await apiClient.get<
    TaskHistoryEntry[] | DataEnvelope<TaskHistoryEntry[]>
  >(`/tasks/${encodeURIComponent(token)}/history`, { params: { date } });
  return normalizeArrayResponse(response.data);
}

async function requestTaskOtp(token: string): Promise<TaskOtpChallenge> {
  const response = await apiClient.post<TaskOtpChallenge>(
    `/tasks/${encodeURIComponent(token)}/otp`,
  );
  return response.data;
}

async function verifyTaskOtp(
  token: string,
  otp: string,
): Promise<{ session_token?: string }> {
  const response = await apiClient.post<{ session_token?: string }>(
    `/tasks/${encodeURIComponent(token)}/verify`,
    { otp },
  );
  return response.data;
}

async function submitTaskAttendance(
  token: string,
  records: Array<{ student_id: string; status: AttendanceTaskStatus }>,
  timetableSlotId?: number | null,
  magicSessionToken?: string,
): Promise<TaskSubmitResponse> {
  const response = await apiClient.post<TaskSubmitResponse>(
    `/tasks/${encodeURIComponent(token)}/attendance`,
    { records, timetable_slot_id: timetableSlotId ?? null },
    createMagicSessionConfig(magicSessionToken),
  );
  return response.data;
}

async function submitTaskReport(
  token: string,
  payload: FormData,
  magicSessionToken?: string,
): Promise<TaskSubmitResponse> {
  const response = await apiClient.post<TaskSubmitResponse>(
    `/tasks/${encodeURIComponent(token)}/submit`,
    payload,
    createMagicSessionConfig(magicSessionToken),
  );
  return response.data;
}

async function delegateTask(
  token: string,
  payload: TaskDelegationPayload,
  magicSessionToken?: string,
): Promise<TaskDelegationResponse> {
  const response = await apiClient.post<TaskDelegationResponse>(
    `/tasks/${encodeURIComponent(token)}/delegate`,
    payload,
    createMagicSessionConfig(magicSessionToken),
  );
  return response.data;
}

export const taskService = {
  createTask,
  getVisitAssignees,
  delegateTask,
  getTask,
  getTaskChain,
  getTaskHistory,
  getTaskStudents,
  requestTaskOtp,
  submitTaskAttendance,
  submitTaskReport,
  verifyTaskOtp,
};
