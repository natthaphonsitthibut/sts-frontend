import { apiClient } from "../../../lib/api-client";
import type {
  TaskAccessTask,
  TaskAraIdChallenge,
  TaskAraIdChallengeStatus,
  TaskChainResponse,
  TaskCreatePayload,
  TaskCreateResponse,
  TaskLinkAdminPayload,
  TaskLinkAdminResponse,
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

async function createTask(
  payload: TaskCreatePayload,
): Promise<TaskCreateResponse> {
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

async function startTaskGoogle(token: string): Promise<string> {
  const response = await apiClient.post<{
    data: { authorizationUrl: string };
  }>(`/tasks/${encodeURIComponent(token)}/google/start`);
  return response.data.data.authorizationUrl;
}

async function verifyDevelopmentTaskGoogle(
  token: string,
  email: string,
): Promise<string> {
  const response = await apiClient.post<{
    data: { sessionToken: string };
  }>(`/tasks/${encodeURIComponent(token)}/google/development`, { email });
  return response.data.data.sessionToken;
}

const TASK_ARAID_CHALLENGE_HEADER = "x-task-araid-challenge";

async function createTaskAraIdChallenge(
  token: string,
): Promise<TaskAraIdChallenge> {
  const response = await apiClient.post<{ data: TaskAraIdChallenge }>(
    `/tasks/${encodeURIComponent(token)}/araid/challenge`,
  );
  return response.data.data;
}

async function beginTaskAraIdChallenge(
  challengeToken: string,
): Promise<{ expiresAt: string }> {
  const response = await apiClient.post<{ data: { expiresAt: string } }>(
    "/tasks/araid/challenge/begin",
    undefined,
    { headers: { [TASK_ARAID_CHALLENGE_HEADER]: challengeToken } },
  );
  return response.data.data;
}

async function approveTaskAraIdChallenge(): Promise<void> {
  await apiClient.post("/tasks/araid/challenge/approve");
}

async function pollTaskAraIdChallenge(
  challengeToken: string,
): Promise<TaskAraIdChallengeStatus> {
  const response = await apiClient.post<{ data: TaskAraIdChallengeStatus }>(
    "/tasks/araid/challenge/status",
    undefined,
    { headers: { [TASK_ARAID_CHALLENGE_HEADER]: challengeToken } },
  );
  return response.data.data;
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
  approveTaskAraIdChallenge,
  beginTaskAraIdChallenge,
  createTask,
  createTaskAraIdChallenge,
  pollTaskAraIdChallenge,
  getVisitAssignees,
  getTask,
  getTaskChain,
  setTaskLinkAdminLock,
  submitTaskReport,
  startTaskGoogle,
  verifyDevelopmentTaskGoogle,
};
