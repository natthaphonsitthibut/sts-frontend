import axios from "axios";
import { appConfig } from "../config/env";
import type { AuthUser } from "../features/auth/types/auth.types";

const AUTH_USER_STORAGE_KEY = "sts_user";

function joinBaseUrl(baseUrl: string, prefix: string): string {
  const normalizedBaseUrl = baseUrl.trim();
  const normalizedPrefix = prefix.trim();

  if (!normalizedPrefix || normalizedPrefix === "/") {
    return normalizedBaseUrl || "/";
  }

  if (!normalizedBaseUrl || normalizedBaseUrl === "/") {
    return normalizedPrefix.startsWith("/") ? normalizedPrefix : `/${normalizedPrefix}`;
  }

  const baseWithoutTrailingSlash = normalizedBaseUrl.replace(/\/+$/, "");
  const prefixWithLeadingSlash = normalizedPrefix.startsWith("/")
    ? normalizedPrefix
    : `/${normalizedPrefix}`;
  if (baseWithoutTrailingSlash.endsWith(prefixWithLeadingSlash)) {
    return baseWithoutTrailingSlash;
  }

  return `${baseWithoutTrailingSlash}/${normalizedPrefix.replace(/^\/+/, "")}`;
}

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
  baseURL: joinBaseUrl(appConfig.apiBaseUrl, appConfig.apiPrefix),
  // Admin identity is a server-signed httpOnly cookie — send it on every request.
  withCredentials: true,
  timeout: 20_000,
});

apiClient.interceptors.request.use((config) => {
  const currentUser = readStoredAuthUser();
  const onTeacherAccessGuestPage =
    typeof window !== "undefined" && window.location.pathname === "/teacher-access";

  // Guest / student flows still authenticate with signed tokens via headers; the
  // admin session is carried entirely by the httpOnly cookie (no client-supplied
  // user id / scope, which the backend no longer trusts).
  if (!onTeacherAccessGuestPage && currentUser?.virtual_login && currentUser.magic_link_token) {
    config.headers["x-magic-link-token"] = currentUser.magic_link_token;
    if (currentUser.magic_session_token) {
      config.headers["x-magic-session"] = currentUser.magic_session_token;
    }
  } else if (!onTeacherAccessGuestPage && currentUser?.virtual_login && currentUser.virtual_auth_token) {
    config.headers["x-virtual-auth"] = currentUser.virtual_auth_token;
  }

  return config;
});

// When a session goes stale the client still looks "logged in" (the user is
// cached in storage), so requests just start failing with 401 and pages get
// stranded in a 401 loop that a reload can't fix. Detect it once, clear the
// session, and bounce to login. This also recovers the magic-login clobber case
// (opening a /login/magic link overwrites the admin store with a virtual_login
// user); public magic/task routes are excluded below so guest 401s are untouched.
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
      const onLoginPage =
        window.location.pathname === "/login" ||
        window.location.pathname === "/admin-access";
      // Public magic-link / task-link pages return 401 when the *link* is
      // invalid / closed / expired — not because the admin's session lapsed.
      // Those pages show their own "ลิงก์ไม่ถูกต้องหรือหมดอายุ" card, so never
      // hijack them into the admin login (which also wiped a real admin session).
      const onPublicLinkPage =
        window.location.pathname.startsWith("/login/magic/") ||
        window.location.pathname.startsWith("/task/") ||
        window.location.pathname.startsWith("/araid") ||
        window.location.pathname === "/teacher-access" ||
        window.location.pathname.startsWith("/apply/");

      if (currentUser && !onLoginPage && !onPublicLinkPage) {
        isHandlingExpiredSession = true;
        window.sessionStorage.removeItem(AUTH_USER_STORAGE_KEY);
        window.localStorage.removeItem(AUTH_USER_STORAGE_KEY);
        const next = encodeURIComponent(
          `${window.location.pathname}${window.location.search}`,
        );
        window.location.assign(`/login?next=${next}`);
      }
    }

    return Promise.reject(error);
  },
);
