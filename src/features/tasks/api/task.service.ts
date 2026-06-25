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
  TaskSubmitResponse,
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
  const response = await apiClient.post<TaskCreateResponse>("/api/tasks", payload);
  return response.data;
}

async function getTaskChain(taskId: string): Promise<TaskChainResponse> {
  const response = await apiClient.get<TaskChainResponse>(
    `/api/tasks/${encodeURIComponent(taskId)}/chain`,
  );
  return response.data;
}

async function getTask(
  token: string,
  magicSessionToken?: string,
): Promise<TaskAccessTask> {
  const response = await apiClient.get<TaskAccessTask>(
    `/api/tasks/${encodeURIComponent(token)}`,
    createMagicSessionConfig(magicSessionToken),
  );
  return response.data;
}

async function getTaskStudents(token: string): Promise<TaskGuestStudent[]> {
  const response = await apiClient.get<
    TaskGuestStudent[] | DataEnvelope<TaskGuestStudent[]>
  >(`/api/tasks/${encodeURIComponent(token)}/students`);
  return normalizeArrayResponse(response.data);
}

async function getTaskHistory(
  token: string,
  date: string,
): Promise<TaskHistoryEntry[]> {
  const response = await apiClient.get<
    TaskHistoryEntry[] | DataEnvelope<TaskHistoryEntry[]>
  >(`/api/tasks/${encodeURIComponent(token)}/history`, { params: { date } });
  return normalizeArrayResponse(response.data);
}

async function requestTaskOtp(token: string): Promise<void> {
  await apiClient.post(`/api/tasks/${encodeURIComponent(token)}/otp`);
}

async function verifyTaskOtp(
  token: string,
  otp: string,
): Promise<{ session_token?: string }> {
  const response = await apiClient.post<{ session_token?: string }>(
    `/api/tasks/${encodeURIComponent(token)}/verify`,
    { otp },
  );
  return response.data;
}

async function submitTaskAttendance(
  token: string,
  records: Array<{ student_id: string; status: AttendanceTaskStatus }>,
  magicSessionToken?: string,
): Promise<TaskSubmitResponse> {
  const response = await apiClient.post<TaskSubmitResponse>(
    `/api/tasks/${encodeURIComponent(token)}/attendance`,
    { records },
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
    `/api/tasks/${encodeURIComponent(token)}/submit`,
    payload,
    createMagicSessionConfig(magicSessionToken),
  );
  return response.data;
}

async function delegateTask(
  token: string,
  payload: TaskDelegationPayload,
): Promise<TaskDelegationResponse> {
  const response = await apiClient.post<TaskDelegationResponse>(
    `/api/tasks/${encodeURIComponent(token)}/delegate`,
    payload,
  );
  return response.data;
}

export const taskService = {
  createTask,
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
