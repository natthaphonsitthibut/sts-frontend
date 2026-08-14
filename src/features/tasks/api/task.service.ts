import { apiClient } from "../../../lib/api-client";
import type {
  TaskAccessTask,
  TaskChainResponse,
  TaskCreatePayload,
  TaskCreateResponse,
  TaskLinkAdminPayload,
  TaskLinkAdminResponse,
  TaskOtpChallenge,
  TaskSubmitResponse,
  VisitAssignee,
} from "../types/task.types";

interface DataEnvelope<T> {
  data?: T;
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

async function setTaskLinkAdminLock(
  linkId: string,
  payload: TaskLinkAdminPayload,
): Promise<TaskLinkAdminResponse> {
  const response = await apiClient.post<TaskLinkAdminResponse>(
    `/task-links/${encodeURIComponent(linkId)}/admin-lock`,
    payload,
  );
  return response.data;
}

export const taskService = {
  createTask,
  getVisitAssignees,
  getTask,
  getTaskChain,
  requestTaskOtp,
  setTaskLinkAdminLock,
  submitTaskReport,
  verifyTaskOtp,
};
