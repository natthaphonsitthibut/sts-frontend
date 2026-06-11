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

function encodeScopeHeader(scope: unknown): string | null {
  try {
    return `uri:${encodeURIComponent(JSON.stringify(scope))}`;
  } catch {
    return null;
  }
}

export const apiClient = axios.create({
  baseURL: appConfig.apiBaseUrl,
});

apiClient.interceptors.request.use((config) => {
  const currentUser = readStoredAuthUser();

  if (currentUser?.virtual_login && currentUser.magic_link_token) {
    config.headers["x-magic-link-token"] = currentUser.magic_link_token;
    if (currentUser.magic_session_token) {
      config.headers["x-magic-session"] = currentUser.magic_session_token;
    }
  } else if (currentUser?.virtual_login && currentUser.virtual_auth_token) {
    config.headers["x-virtual-auth"] = currentUser.virtual_auth_token;
  } else if (currentUser?.id) {
    config.headers["x-user-id"] = String(currentUser.id);
  }

  if (currentUser?.data_scope) {
    const encodedScope = encodeScopeHeader(currentUser.data_scope);
    if (encodedScope) {
      config.headers["x-user-scope"] = encodedScope;
    }
  }

  return config;
});
