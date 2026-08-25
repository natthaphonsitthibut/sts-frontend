import { apiClient } from "../../../lib/api-client";
import type {
  AuthUser,
  AraIdLoginChallenge,
  AraIdLoginChallengeStatus,
  ChangePasswordPayload,
  LoginCredentials,
  UpdateProfilePayload,
} from "../types/auth.types";

interface AuthService {
  changeOwnPassword: (payload: ChangePasswordPayload) => Promise<void>;
  getMyProfile: () => Promise<AuthUser>;
  getUserProfile: (userId: number) => Promise<AuthUser>;
  updateMyProfile: (payload: UpdateProfilePayload) => Promise<AuthUser>;
  updateMyPhoto: (input: {
    photo?: File;
    remove?: boolean;
  }) => Promise<AuthUser>;
  login: (credentials: LoginCredentials) => Promise<AuthUser>;
  logout: () => Promise<void>;
  createAraIdLoginChallenge: () => Promise<AraIdLoginChallenge>;
  beginAraIdLoginChallenge: (
    challengeToken: string,
  ) => Promise<{ expiresAt: string }>;
  approveAraIdLoginChallenge: () => Promise<void>;
  pollAraIdLoginChallenge: (
    challengeToken: string,
  ) => Promise<AraIdLoginChallengeStatus>;
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
async function updateMyPhoto(input: {
  photo?: File;
  remove?: boolean;
}): Promise<AuthUser> {
  const form = new FormData();
  if (input.photo) form.append("photo", input.photo);
  if (input.remove) form.append("removePhoto", "true");
  const response = await apiClient.patch<AuthUser>("/users/me/photo", form);
  return response.data;
}

async function logout(): Promise<void> {
  await apiClient.post("/users/logout");
}

async function changeOwnPassword(
  payload: ChangePasswordPayload,
): Promise<void> {
  await apiClient.post("/users/me/change-password", payload);
}

const ARAID_CHALLENGE_HEADER = "x-auth-araid-challenge";

async function createAraIdLoginChallenge(): Promise<AraIdLoginChallenge> {
  const response = await apiClient.post<{ data: AraIdLoginChallenge }>(
    "/auth/araid/challenge",
  );
  return response.data.data;
}

async function beginAraIdLoginChallenge(
  challengeToken: string,
): Promise<{ expiresAt: string }> {
  const response = await apiClient.post<{ data: { expiresAt: string } }>(
    "/auth/araid/challenge/begin",
    undefined,
    { headers: { [ARAID_CHALLENGE_HEADER]: challengeToken } },
  );
  return response.data.data;
}

async function approveAraIdLoginChallenge(): Promise<void> {
  await apiClient.post("/auth/araid/challenge/approve");
}

async function pollAraIdLoginChallenge(
  challengeToken: string,
): Promise<AraIdLoginChallengeStatus> {
  const response = await apiClient.post<{ data: AraIdLoginChallengeStatus }>(
    "/auth/araid/challenge/status",
    undefined,
    { headers: { [ARAID_CHALLENGE_HEADER]: challengeToken } },
  );
  return response.data.data;
}

export const authService: AuthService = {
  changeOwnPassword,
  approveAraIdLoginChallenge,
  beginAraIdLoginChallenge,
  createAraIdLoginChallenge,
  getMyProfile,
  getUserProfile,
  login,
  logout,
  pollAraIdLoginChallenge,
  updateMyProfile,
  updateMyPhoto,
};
