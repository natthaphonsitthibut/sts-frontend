import type { BadgeProps } from "../../../components/base";
import { formatThaiDateTime } from "../../../lib/date-time";
import { isLinkLocked } from "../../../lib/link-lock";
import type { LoginLink } from "../types/login-links.types";

type LoginLinkLockInput = Pick<LoginLink, "admin_locked">;
type LoginLinkStateInput = Pick<LoginLink, "admin_locked" | "expires_at">;
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
): "ACTIVE" | "LOCKED" | "EXPIRED" {
  const expiresAt = new Date(link.expires_at);
  if (!Number.isNaN(expiresAt.getTime()) && expiresAt.getTime() < Date.now()) {
    return "EXPIRED";
  }
  if (isLoginLinkLocked(link)) {
    return "LOCKED";
  }
  return "ACTIVE";
}

export const LOGIN_LINK_STATE_OPTIONS = [
  { value: "ALL", label: "ทั้งหมด" },
  { value: "ACTIVE", label: "ใช้งานได้" },
  { value: "LOCKED", label: "ปิดอยู่" },
  { value: "EXPIRED", label: "หมดอายุ" },
] as const;

export function getLoginLinkStatusMeta(link: LoginLinkOutcomeInput): LoginLinkStatusMeta {
  if (link.first_used_at) {
    return { label: "เข้าใช้แล้ว", variant: "success" };
  }
  if (isLoginLinkLocked(link)) {
    return { label: "ปิดอยู่", variant: "destructive" };
  }
  return { label: "ยังไม่เข้าใช้", variant: "secondary" };
}

export function formatLoginLinkDateTime(value: string): string {
  return formatThaiDateTime(value);
}

export const LOGIN_LINK_DURATION_UNITS = [
  { value: "minutes", label: "นาที" },
  { value: "hours", label: "ชั่วโมง" },
  { value: "days", label: "วัน" },
] as const;
