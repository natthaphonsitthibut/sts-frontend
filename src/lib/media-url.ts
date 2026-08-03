import { appConfig } from "../config/env";

/**
 * Turn an app-relative media path (`/api/teachers/12/photo`) into a URL the
 * browser can load, honouring a configured API base that differs from the site
 * origin.
 *
 * Every private image in the system is served this way rather than linked
 * directly at object storage: the request hits the guarded endpoint, which
 * checks permission and scope and then redirects to a short-lived signed URL.
 * Keep new image features on this helper so they all behave identically.
 */
export function resolveApiMediaUrl(path: string | null): string | null {
  if (!path) return null;
  const configuredBaseUrl = appConfig.apiBaseUrl.trim();
  if (!configuredBaseUrl || configuredBaseUrl === "/") return path;
  try {
    const baseUrl = configuredBaseUrl.startsWith("http")
      ? configuredBaseUrl
      : window.location.origin;
    return new URL(path, baseUrl).toString();
  } catch {
    return path;
  }
}
