import axios from "axios";
import { appConfig } from "../config/env";
import type { AuthUser } from "../features/auth/types/auth.types";

const AUTH_USER_STORAGE_KEY = "sts_user";

function readStoredAuthUser(): AuthUser | null {
  if (typeof window === "undefined") {
    return null;
  }

  const userData =
    window.sessionStorage.getItem(AUTH_USER_STORAGE_KEY) ||
    window.localStorage.getItem(AUTH_USER_STORAGE_KEY);

  if (!userData) {
    return null;
  }

  try {
    return JSON.parse(userData) as AuthUser;
  } catch {
    return null;
  }
}

export const apiClient = axios.create({
  baseURL: appConfig.apiBaseUrl,
  // Admin identity is a server-signed httpOnly cookie — send it on every request.
  withCredentials: true,
});

apiClient.interceptors.request.use((config) => {
  const currentUser = readStoredAuthUser();

  // Guest / student flows still authenticate with signed tokens via headers; the
  // admin session is carried entirely by the httpOnly cookie (no client-supplied
  // user id / scope, which the backend no longer trusts).
  if (currentUser?.virtual_login && currentUser.magic_link_token) {
    config.headers["x-magic-link-token"] = currentUser.magic_link_token;
    if (currentUser.magic_session_token) {
      config.headers["x-magic-session"] = currentUser.magic_session_token;
    }
  } else if (currentUser?.virtual_login && currentUser.virtual_auth_token) {
    config.headers["x-virtual-auth"] = currentUser.virtual_auth_token;
  }

  return config;
});
