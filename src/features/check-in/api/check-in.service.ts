import { apiClient } from "../../../lib/api-client";
import { getApiErrorMessage } from "../../../lib/api-error";
import type {
  AraIdChallenge,
  AttendanceExceptionStatus,
  CheckInContext,
  CheckInOptions,
  CheckInSession,
  CheckInStudent,
} from "../types/check-in.types";

interface DataEnvelope<T> {
  success: true;
  data: T;
}

const TOKEN_HEADER = "x-classroom-link-token";

async function publicTokenRequest<T>(
  request: () => Promise<{ data: DataEnvelope<T> }>,
  fallback: string,
): Promise<T> {
  try {
    return (await request()).data.data;
  } catch (error) {
    // Never rethrow Axios' request object: it retains the raw classroom token
    // in config.headers and can later be printed by a generic error boundary.
    // eslint-disable-next-line preserve-caught-error -- attaching the Axios error would retain the secret request header
    throw new Error(getApiErrorMessage(error, fallback));
  }
}

async function getPublicContext(token?: string): Promise<CheckInContext> {
  return await publicTokenRequest(
    () =>
      apiClient.get<DataEnvelope<CheckInContext>>("/check-in/context", {
        headers: token ? { [TOKEN_HEADER]: token } : undefined,
      }),
    "เปิดลิงก์ห้องเรียนไม่สำเร็จ",
  );
}

async function startGoogle(token: string): Promise<string> {
  const result = await publicTokenRequest(
    () =>
      apiClient.get<DataEnvelope<{ authorizationUrl: string }>>(
        "/check-in/auth/google/start",
        { headers: { [TOKEN_HEADER]: token } },
      ),
    "เริ่มยืนยันด้วย Google ไม่สำเร็จ",
  );
  return result.authorizationUrl;
}

async function verifyDevelopmentGoogle(
  token: string,
  email: string,
): Promise<void> {
  await publicTokenRequest(
    () =>
      apiClient.post<DataEnvelope<{ authenticated: true }>>(
        "/check-in/auth/google/development",
        { email },
        { headers: { [TOKEN_HEADER]: token } },
      ),
    "ตรวจสอบอีเมลครูไม่สำเร็จ",
  );
}

async function createAraIdChallenge(token: string): Promise<AraIdChallenge> {
  return await publicTokenRequest(
    () =>
      apiClient.post<DataEnvelope<AraIdChallenge>>(
        "/check-in/auth/araid/challenge",
        undefined,
        { headers: { [TOKEN_HEADER]: token } },
      ),
    "เริ่มยืนยันด้วย AraID ไม่สำเร็จ",
  );
}

async function pollAraIdChallenge(challengeToken: string): Promise<{
  status: "PENDING" | "IN_PROGRESS" | "APPROVED";
}> {
  return await publicTokenRequest(
    () =>
      apiClient.post<
        DataEnvelope<{ status: "PENDING" | "IN_PROGRESS" | "APPROVED" }>
      >("/check-in/auth/araid/challenge/status", undefined, {
        headers: { "x-araid-challenge": challengeToken },
      }),
    "ตรวจสอบสถานะ AraID ไม่สำเร็จ",
  );
}

async function getOptions(input: {
  access: "INTERNAL" | "PUBLIC_LINK";
  date: string;
  classroomId?: number;
}): Promise<CheckInOptions> {
  const response = await apiClient.get<DataEnvelope<CheckInOptions>>(
    input.access === "INTERNAL"
      ? "/attendance/check-in/options"
      : "/check-in/subjects",
    {
      params: {
        date: input.date,
        ...(input.access === "INTERNAL"
          ? { classroomId: input.classroomId }
          : {}),
      },
    },
  );
  return response.data.data;
}

async function getRoster(input: {
  access: "INTERNAL" | "PUBLIC_LINK";
  classroomId?: number;
}): Promise<CheckInStudent[]> {
  const response = await apiClient.get<DataEnvelope<CheckInStudent[]>>(
    input.access === "INTERNAL"
      ? "/attendance/check-in/roster"
      : "/check-in/roster",
    {
      params:
        input.access === "INTERNAL"
          ? { classroomId: input.classroomId }
          : undefined,
    },
  );
  return response.data.data ?? [];
}

async function startSession(input: {
  access: "INTERNAL" | "PUBLIC_LINK";
  classroomId?: number;
  date: string;
  classroomSubjectId: number;
}): Promise<CheckInSession> {
  const response = await apiClient.post<DataEnvelope<CheckInSession>>(
    input.access === "INTERNAL"
      ? "/attendance/check-in/sessions/start"
      : "/check-in/sessions/start",
    {
      date: input.date,
      classroomSubjectId: input.classroomSubjectId,
      ...(input.access === "INTERNAL"
        ? { classroomId: input.classroomId }
        : {}),
    },
  );
  return response.data.data;
}

async function submitSession(input: {
  access: "INTERNAL" | "PUBLIC_LINK";
  sessionId: string;
  exceptions: Array<{
    studentId: string;
    status: AttendanceExceptionStatus;
    markedAt: string;
  }>;
}): Promise<CheckInSession> {
  const response = await apiClient.post<DataEnvelope<CheckInSession>>(
    input.access === "INTERNAL"
      ? `/attendance/check-in/sessions/${input.sessionId}/submit`
      : `/check-in/sessions/${input.sessionId}/submit`,
    { exceptions: input.exceptions },
  );
  return response.data.data;
}

async function getStudentPhoto(input: {
  access: "INTERNAL" | "PUBLIC_LINK";
  classroomId?: number;
  studentId: string;
}): Promise<Blob> {
  const response = await apiClient.get<Blob>(
    input.access === "INTERNAL"
      ? "/attendance/check-in/student-photo"
      : "/check-in/student-photo",
    {
      params: {
        studentId: input.studentId,
        ...(input.access === "INTERNAL"
          ? { classroomId: input.classroomId }
          : {}),
      },
      responseType: "blob",
    },
  );
  return response.data;
}

export const checkInService = {
  createAraIdChallenge,
  getOptions,
  getPublicContext,
  getRoster,
  getStudentPhoto,
  pollAraIdChallenge,
  startGoogle,
  verifyDevelopmentGoogle,
  startSession,
  submitSession,
};
