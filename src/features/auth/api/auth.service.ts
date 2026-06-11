import { apiClient } from "../../../lib/api-client";
import type {
  AuthUser,
  ChangePasswordPayload,
  LoginCredentials,
  MagicLoginVerifyResponse,
  MagicOtpVerifyResponse,
  MockThaIdLoginPayload,
} from "../types/auth.types";

interface AuthService {
  changeOwnPassword: (payload: ChangePasswordPayload) => Promise<void>;
  getUserProfile: (userId: number) => Promise<AuthUser>;
  login: (credentials: LoginCredentials) => Promise<AuthUser>;
  loginWithMockThaId: (payload: MockThaIdLoginPayload) => Promise<AuthUser>;
  requestMagicOtp: (token: string) => Promise<void>;
  verifyMagicLogin: (
    token: string,
    magicSessionToken?: string,
  ) => Promise<MagicLoginVerifyResponse>;
  verifyMagicOtp: (token: string, otp: string) => Promise<MagicOtpVerifyResponse>;
}

async function login(credentials: LoginCredentials): Promise<AuthUser> {
  const response = await apiClient.post<AuthUser>("/api/users/login", credentials);
  return response.data;
}

async function getUserProfile(userId: number): Promise<AuthUser> {
  const response = await apiClient.get<AuthUser>(`/api/users/${userId}`);
  return response.data;
}

async function changeOwnPassword(payload: ChangePasswordPayload): Promise<void> {
  await apiClient.post("/api/users/me/change-password", payload);
}

async function loginWithMockThaId(
  payload: MockThaIdLoginPayload,
): Promise<AuthUser> {
  const response = await apiClient.post<AuthUser>(
    "/api/auth/thaid/mock/login",
    payload,
  );
  return response.data;
}

async function verifyMagicLogin(
  token: string,
  magicSessionToken?: string,
): Promise<MagicLoginVerifyResponse> {
  const response = magicSessionToken
    ? await apiClient.get<MagicLoginVerifyResponse>(
        `/api/tasks/${token}/login-verify`,
        {
          headers: { "x-magic-session": magicSessionToken },
        },
      )
    : await apiClient.get<MagicLoginVerifyResponse>(
        `/api/tasks/${token}/login-verify`,
      );

  return response.data;
}

async function requestMagicOtp(token: string): Promise<void> {
  await apiClient.post(`/api/tasks/${token}/otp`);
}

async function verifyMagicOtp(
  token: string,
  otp: string,
): Promise<MagicOtpVerifyResponse> {
  const response = await apiClient.post<MagicOtpVerifyResponse>(
    `/api/tasks/${token}/verify`,
    { otp },
  );
  return response.data;
}

export const authService: AuthService = {
  changeOwnPassword,
  getUserProfile,
  login,
  loginWithMockThaId,
  requestMagicOtp,
  verifyMagicLogin,
  verifyMagicOtp,
};
