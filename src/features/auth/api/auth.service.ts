import { apiClient } from "../../../lib/api-client";
import type {
  AuthUser,
  ChangePasswordPayload,
  LoginCredentials,
  MagicLoginVerifyResponse,
  MagicOtpVerifyResponse,
  MockThaIdLoginPayload,
  UpdateProfilePayload,
} from "../types/auth.types";

interface AuthService {
  changeOwnPassword: (payload: ChangePasswordPayload) => Promise<void>;
  getMyProfile: () => Promise<AuthUser>;
  getUserProfile: (userId: number) => Promise<AuthUser>;
  updateMyProfile: (payload: UpdateProfilePayload) => Promise<AuthUser>;
  updateMyPhoto: (input: { photo?: File; remove?: boolean }) => Promise<AuthUser>;
  login: (credentials: LoginCredentials) => Promise<AuthUser>;
  logout: () => Promise<void>;
  loginWithMockThaId: (payload: MockThaIdLoginPayload) => Promise<AuthUser>;
  requestMagicOtp: (token: string) => Promise<void>;
  verifyMagicLogin: (
    token: string,
    magicSessionToken?: string,
  ) => Promise<MagicLoginVerifyResponse>;
  verifyMagicOtp: (token: string, otp: string) => Promise<MagicOtpVerifyResponse>;
}

async function login(credentials: LoginCredentials): Promise<AuthUser> {
  const response = await apiClient.post<AuthUser>("/users/login", credentials);
  return response.data;
}

async function getUserProfile(userId: number): Promise<AuthUser> {
  const response = await apiClient.get<AuthUser>(`/users/${userId}`);
  return response.data;
}

async function getMyProfile(): Promise<AuthUser> {
  const response = await apiClient.get<AuthUser>("/users/me");
  return response.data;
}

async function updateMyProfile(
  payload: UpdateProfilePayload,
): Promise<AuthUser> {
  const response = await apiClient.patch<AuthUser>("/users/me", payload);
  return response.data;
}

/** Upload replaces the photo; passing no file with `remove` clears it. */
async function updateMyPhoto(input: { photo?: File; remove?: boolean }): Promise<AuthUser> {
  const form = new FormData();
  if (input.photo) form.append("photo", input.photo);
  if (input.remove) form.append("removePhoto", "true");
  const response = await apiClient.patch<AuthUser>("/users/me/photo", form);
  return response.data;
}

async function logout(): Promise<void> {
  await apiClient.post("/users/logout");
}

async function changeOwnPassword(payload: ChangePasswordPayload): Promise<void> {
  await apiClient.post("/users/me/change-password", payload);
}

async function loginWithMockThaId(
  payload: MockThaIdLoginPayload,
): Promise<AuthUser> {
  const response = await apiClient.post<AuthUser>(
    "/auth/thaid/mock/login",
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
        `/tasks/${token}/login-verify`,
        {
          headers: { "x-magic-session": magicSessionToken },
        },
      )
    : await apiClient.get<MagicLoginVerifyResponse>(
        `/tasks/${token}/login-verify`,
      );

  return response.data;
}

async function requestMagicOtp(token: string): Promise<void> {
  await apiClient.post(`/tasks/${token}/otp`);
}

async function verifyMagicOtp(
  token: string,
  otp: string,
): Promise<MagicOtpVerifyResponse> {
  const response = await apiClient.post<MagicOtpVerifyResponse>(
    `/tasks/${token}/verify`,
    { otp },
  );
  return response.data;
}

export const authService: AuthService = {
  changeOwnPassword,
  getMyProfile,
  getUserProfile,
  login,
  logout,
  loginWithMockThaId,
  requestMagicOtp,
  updateMyProfile,
  updateMyPhoto,
  verifyMagicLogin,
  verifyMagicOtp,
};
