import type { BadgeProps } from "../../../components/base";
import { formatThaiDateTime } from "../../../lib/date-time";
import { isLinkLocked } from "../../../lib/link-lock";
import type { LoginLink } from "../types/login-links.types";
import { findStatusCatalogItem } from "../../status-catalog/hooks/useStatusCatalog";
import type { StatusCatalogItem } from "../../status-catalog/types/status-catalog.types";

type LoginLinkLockInput = Pick<LoginLink, "admin_locked">;
type LoginLinkStateInput = Pick<LoginLink, "admin_locked" | "expires_at" | "link_state">;
type LoginLinkOutcomeInput = Pick<LoginLink, "admin_locked" | "first_used_at">;

/** The login magic link is the task link with /task/ swapped for /login/magic/. */
export function getLoginLinkUrl(magicLink: string): string {
  if (!magicLink) {
    return "";
  }
  const loginPath = magicLink.replace("/task/", "/login/magic/");
  if (/^https?:\/\//.test(loginPath)) {
    return loginPath;
  }
  if (typeof window !== "undefined") {
    return `${window.location.origin}${loginPath.startsWith("/") ? "" : "/"}${loginPath}`;
  }
  return loginPath;
}

export function isLoginLinkLocked(link: LoginLinkLockInput): boolean {
  return isLinkLocked(link.admin_locked);
}

interface LoginLinkStatusMeta {
  label: string;
  variant: BadgeProps["variant"];
}

export function getLoginLinkState(
  link: LoginLinkStateInput,
): "ACTIVE" | "LOCKED" | "EXPIRED" | "SCHEDULED" {
  // Prefer the server-computed state (it already accounts for opens_at/expiry);
  // fall back to the local heuristic for payloads without link_state.
  if (
    link.link_state === "ACTIVE" ||
    link.link_state === "LOCKED" ||
    link.link_state === "EXPIRED" ||
    link.link_state === "SCHEDULED"
  ) {
    return link.link_state;
  }
  const expiresAt = new Date(link.expires_at);
  if (!Number.isNaN(expiresAt.getTime()) && expiresAt.getTime() < Date.now()) {
    return "EXPIRED";
  }
  if (isLoginLinkLocked(link)) {
    return "LOCKED";
  }
  return "ACTIVE";
}

function statusMeta(
  catalog: readonly StatusCatalogItem[],
  code: string,
): LoginLinkStatusMeta {
  const item = findStatusCatalogItem(catalog, code);
  return { label: item?.label ?? code, variant: item?.badgeVariant ?? "secondary" };
}

export function getLoginLinkStateMeta(
  link: LoginLinkStateInput,
  catalog: readonly StatusCatalogItem[],
): LoginLinkStatusMeta {
  return statusMeta(catalog, getLoginLinkState(link));
}

export function getLoginLinkStatusMeta(
  link: LoginLinkOutcomeInput,
  stateCatalog: readonly StatusCatalogItem[],
  usageCatalog: readonly StatusCatalogItem[],
): LoginLinkStatusMeta {
  if (link.first_used_at) {
    return statusMeta(usageCatalog, "USED");
  }
  if (isLoginLinkLocked(link)) {
    return statusMeta(stateCatalog, "LOCKED");
  }
  return statusMeta(usageCatalog, "UNUSED");
}

export function formatLoginLinkDateTime(value: string): string {
  return formatThaiDateTime(value);
}

export const LOGIN_LINK_DURATION_UNITS = [
  { value: "minutes", label: "นาที" },
  { value: "hours", label: "ชั่วโมง" },
  { value: "days", label: "วัน" },
] as const;
