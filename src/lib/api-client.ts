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

// When the admin session cookie has expired the client still looks "logged in"
// (the user is cached in storage), so requests just start failing with 401 and
// dropdowns silently go empty. Detect that once, clear the stale session, and
// bounce to the login page so the user is never stranded. Guest/magic flows
// (virtual_login) manage their own token errors, so they are left alone.
let isHandlingExpiredSession = false;

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status =
      error && typeof error === "object" && "response" in error
        ? (error as { response?: { status?: number } }).response?.status
        : undefined;

    if (status === 401 && typeof window !== "undefined" && !isHandlingExpiredSession) {
      const currentUser = readStoredAuthUser();
      const onLoginPage = window.location.pathname.startsWith("/admin-access");
      // Public magic-link / task-link pages return 401 when the *link* is
      // invalid / closed / expired — not because the admin's session lapsed.
      // Those pages show their own "ลิงก์ไม่ถูกต้องหรือหมดอายุ" card, so never
      // hijack them into the admin login (which also wiped a real admin session).
      const onPublicLinkPage =
        window.location.pathname.startsWith("/login/magic/") ||
        window.location.pathname.startsWith("/task/");

      if (currentUser && !currentUser.virtual_login && !onLoginPage && !onPublicLinkPage) {
        isHandlingExpiredSession = true;
        window.sessionStorage.removeItem(AUTH_USER_STORAGE_KEY);
        window.localStorage.removeItem(AUTH_USER_STORAGE_KEY);
        const next = encodeURIComponent(
          `${window.location.pathname}${window.location.search}`,
        );
        window.location.assign(`/admin-access?next=${next}`);
      }
    }

    return Promise.reject(error);
  },
);
