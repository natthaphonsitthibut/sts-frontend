import { apiClient } from "../../../lib/api-client";
import { getApiErrorMessage } from "../../../lib/api-error";

interface DataEnvelope<T> {
  data: T;
}

export interface TeacherLineInvitationSummary {
  teacherName: string;
  maskedEmail: string;
  expiresAt: string;
}

async function invitationPost<T>(
  path: string,
  body: { token: string; code?: string },
  fallback: string,
): Promise<T> {
  try {
    const response = await apiClient.post<DataEnvelope<T>>(path, body);
    return response.data.data;
  } catch (error) {
    // Do not retain Axios' request config: it contains the invitation token.
    // eslint-disable-next-line preserve-caught-error
    throw new Error(getApiErrorMessage(error, fallback));
  }
}

async function resolveInvitation(
  token: string,
): Promise<TeacherLineInvitationSummary> {
  return invitationPost(
    "/line/link/invitation/resolve",
    { token },
    "ลิงก์ยืนยัน LINE ไม่ถูกต้องหรือหมดอายุแล้ว",
  );
}

async function requestInvitationOtp(token: string): Promise<string> {
  const result = await invitationPost<{ message: string }>(
    "/line/link/invitation/otp/request",
    { token },
    "ส่งรหัส OTP ไม่สำเร็จ",
  );
  return result.message;
}

async function verifyInvitationOtp(
  token: string,
  code: string,
): Promise<{ bindingToken: string; teacherName: string }> {
  return invitationPost(
    "/line/link/invitation/otp/verify",
    { token, code },
    "ยืนยันรหัสไม่สำเร็จ",
  );
}

/** Identical whether or not the address belongs to a teacher, by design. */
async function requestOtp(email: string): Promise<string> {
  const response = await apiClient.post<DataEnvelope<{ message: string }>>(
    "/line/link/otp/request",
    { email },
  );
  return response.data.data.message;
}

async function verifyOtp(
  email: string,
  code: string,
): Promise<{ bindingToken: string; teacherName: string }> {
  try {
    const response = await apiClient.post<
      DataEnvelope<{ bindingToken: string; teacherName: string }>
    >("/line/link/otp/verify", { email, code });
    return response.data.data;
  } catch (error) {
    const message = getApiErrorMessage(error, "ยืนยันรหัสไม่สำเร็จ");
    // Keeps the reason (wrong / expired / locked) but drops the Axios error,
    // whose request config still holds the code the person just typed.
    // eslint-disable-next-line preserve-caught-error
    throw new Error(message);
  }
}

async function isEnabled(): Promise<boolean> {
  const response =
    await apiClient.get<DataEnvelope<{ enabled: boolean }>>(
      "/line/link/status",
    );
  return response.data.data.enabled;
}

/** The short-lived proof stays in the request body, never browser history. */
async function startAuthorization(bindingToken: string): Promise<string> {
  const response = await apiClient.post<
    DataEnvelope<{ authorizationUrl: string }>
  >("/line/link/start", { token: bindingToken });
  return response.data.data.authorizationUrl;
}

export const teacherLineService = {
  resolveInvitation,
  requestInvitationOtp,
  verifyInvitationOtp,
  requestOtp,
  verifyOtp,
  isEnabled,
  startAuthorization,
};
