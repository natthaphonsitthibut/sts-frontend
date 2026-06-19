import type { BadgeProps } from "../../../components/base";
import { isLinkLocked } from "../../../lib/link-lock";
import type { LoginLink } from "../types/login-links.types";

type LoginLinkLockInput = Pick<LoginLink, "admin_locked">;
type LoginLinkStateInput = Pick<LoginLink, "admin_locked" | "expires_at">;

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
): "ACTIVE" | "LOCKED" | "EXPIRED" {
  if (isLoginLinkLocked(link)) {
    return "LOCKED";
  }
  const expiresAt = new Date(link.expires_at);
  if (!Number.isNaN(expiresAt.getTime()) && expiresAt.getTime() < Date.now()) {
    return "EXPIRED";
  }
  return "ACTIVE";
}

export const LOGIN_LINK_STATE_OPTIONS = [
  { value: "ALL", label: "ทั้งหมด" },
  { value: "ACTIVE", label: "ใช้งานอยู่" },
  { value: "LOCKED", label: "ถูกปิด" },
  { value: "EXPIRED", label: "หมดอายุ" },
] as const;

export function getLoginLinkStatusMeta(link: LoginLinkStateInput): LoginLinkStatusMeta {
  if (isLoginLinkLocked(link)) {
    return { label: "ถูกปิด", variant: "destructive" };
  }

  const expiresAt = new Date(link.expires_at);
  const isExpired =
    !Number.isNaN(expiresAt.getTime()) && expiresAt.getTime() < Date.now();
  if (isExpired) {
    return { label: "หมดอายุ", variant: "secondary" };
  }

  return { label: "ใช้งานอยู่", variant: "success" };
}

export function formatLoginLinkDateTime(value: string): string {
  if (!value) {
    return "-";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString("th-TH", {
    day: "2-digit",
    month: "short",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export const LOGIN_LINK_DURATION_UNITS = [
  { value: "minutes", label: "นาที" },
  { value: "hours", label: "ชั่วโมง" },
  { value: "days", label: "วัน" },
] as const;
