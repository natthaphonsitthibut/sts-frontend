import axios from "axios";
import { appConfig } from "../config/env";
import { useSchoolFilterStore } from "../features/school-filter/store/school-filter.store";
import type { AuthUser } from "../features/auth/types/auth.types";
import {
  isPublicClassroomLinkPath,
  isPublicLinkPath,
} from "./public-link-routes";

const AUTH_USER_STORAGE_KEY = "sts_user";

function joinBaseUrl(baseUrl: string, prefix: string): string {
  const normalizedBaseUrl = baseUrl.trim();
  const normalizedPrefix = prefix.trim();

  if (!normalizedPrefix || normalizedPrefix === "/") {
    return normalizedBaseUrl || "/";
  }

  if (!normalizedBaseUrl || normalizedBaseUrl === "/") {
    return normalizedPrefix.startsWith("/")
      ? normalizedPrefix
      : `/${normalizedPrefix}`;
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
  // The classroom link surface carries its own link token.
  const onPublicCheckInPage =
    typeof window !== "undefined" &&
    isPublicClassroomLinkPath(window.location.pathname);

  // Public magic-link flows authenticate with short-lived signed tokens via
  // headers; the staff session is carried entirely by the httpOnly cookie.
  if (
    !onPublicCheckInPage &&
    currentUser?.virtual_login &&
    currentUser.magic_link_token
  ) {
    config.headers["x-magic-link-token"] = currentUser.magic_link_token;
    if (currentUser.magic_session_token) {
      config.headers["x-magic-session"] = currentUser.magic_session_token;
    }
  }

  return config;
});

// When a session goes stale the client still looks "logged in" (the user is
// cached in storage), so requests just start failing with 401 and pages get
// stranded in a 401 loop that a reload can't fix. Detect it once, clear the
// session, and bounce to login. Public magic/task routes are excluded below so
// guest 401s are untouched.
let isHandlingExpiredSession = false;

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status =
      error && typeof error === "object" && "response" in error
        ? (error as { response?: { status?: number } }).response?.status
        : undefined;

    if (
      status === 401 &&
      typeof window !== "undefined" &&
      !isHandlingExpiredSession
    ) {
      const currentUser = readStoredAuthUser();
      const onLoginPage =
        window.location.pathname === "/login" ||
        window.location.pathname === "/admin-access";
      // Public link pages return 401 when the *link* (or its own link session)
      // is invalid / closed / expired — not because the admin's session lapsed.
      // Those pages show their own state for it, so never hijack them into the
      // admin login (which also wiped a real admin session and school filter).
      const onPublicLinkPage = isPublicLinkPath(window.location.pathname);

      if (currentUser && !onLoginPage && !onPublicLinkPage) {
        isHandlingExpiredSession = true;
        window.sessionStorage.removeItem(AUTH_USER_STORAGE_KEY);
        window.localStorage.removeItem(AUTH_USER_STORAGE_KEY);
        // The next sign-in on this browser must never inherit a departing
        // session's school/area selection — same cleanup as a normal logout.
        useSchoolFilterStore.getState().clearAll();
        const next = encodeURIComponent(
          `${window.location.pathname}${window.location.search}`,
        );
        window.location.assign(`/login?next=${next}`);
      }
    }

    return Promise.reject(error);
  },
);
