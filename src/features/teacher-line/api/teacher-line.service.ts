import { apiClient } from "../../../lib/api-client";
import { getApiErrorMessage } from "../../../lib/api-error";

interface DataEnvelope<T> {
  data: T;
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
  const response = await apiClient.get<DataEnvelope<{ enabled: boolean }>>("/line/link/status");
  return response.data.data.enabled;
}

/** The short-lived proof stays in the request body, never browser history. */
async function startAuthorization(bindingToken: string): Promise<string> {
  const response = await apiClient.post<DataEnvelope<{ authorizationUrl: string }>>(
    "/line/link/start",
    { token: bindingToken },
  );
  return response.data.data.authorizationUrl;
}

export const teacherLineService = {
  requestOtp,
  verifyOtp,
  isEnabled,
  startAuthorization,
};
