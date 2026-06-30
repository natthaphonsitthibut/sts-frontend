import type { BadgeProps } from "../../../components/base";
import { formatThaiDate, formatThaiDateTime } from "../../../lib/date-time";
import { isLinkLocked as isTaskLinkLocked } from "../../../lib/link-lock";
import type { AttendanceTaskStatus } from "../types/task.types";
import type { TaskChainLink } from "../types/task.types";

export function formatDateTime(value?: string | null): string {
  return formatThaiDateTime(value);
}

export function formatDate(value?: string | null): string {
  return formatThaiDate(value);
}

export function formatDateTimeRangeAge(
  startValue?: string | null,
  endValue?: string | null,
): string {
  if (!startValue || !endValue) {
    return "-";
  }
  const start = new Date(startValue);
  const end = new Date(endValue);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return "-";
  }
  const totalHours = Math.max(0, Math.round((end.getTime() - start.getTime()) / 3_600_000));
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;
  if (days > 0 && hours > 0) return `${days} วัน ${hours} ชม.`;
  if (days > 0) return `${days} วัน`;
  return `${hours} ชม.`;
}

export function getTaskTypeLabel(type?: string | null): string {
  if (type === "ATTENDANCE") return "เช็คชื่อ";
  if (type === "VISIT") return "ลงพื้นที่";
  if (type === "LOGIN") return "เข้าสู่ระบบ";
  return type || "-";
}

export function getStatusLabel(status?: string | null): string {
  if (status === "ACTIVE") return "ใช้งาน";
  if (status === "LOCKED") return "ปิดใช้งาน";
  if (status === "EXPIRED") return "หมดอายุ";
  if (status === "COMPLETED") return "เสร็จสิ้น";
  if (status === "DELEGATED") return "ส่งต่อแล้ว";
  if (status === "OPEN") return "เปิดเคส";
  if (status === "PENDING_REVIEW") return "รอตรวจ";
  if (status === "IN_PROGRESS") return "กำลังติดตาม";
  if (status === "AWAITING_HELP") return "รอช่วยเหลือ";
  if (status === "RESOLVED") return "ปิดเคส";
  return status || "-";
}

export interface TaskLinkDisplayStatus {
  label: string;
  variant: BadgeProps["variant"];
  state: "ACTIVE" | "LOCKED" | "EXPIRED" | "COMPLETED" | "OTHER";
}

export function getTaskLinkDisplayStatus(link: TaskChainLink): TaskLinkDisplayStatus {
  const hasSubmission = Boolean(link.submission?.submitted_at || link.submission);
  if (link.status === "COMPLETED" || hasSubmission) {
    return { label: "เสร็จสิ้น", variant: "success", state: "COMPLETED" };
  }
  const expiresAt = link.expires_at ? new Date(link.expires_at) : null;
  if (expiresAt && !Number.isNaN(expiresAt.getTime()) && expiresAt.getTime() <= Date.now()) {
    return { label: "หมดอายุ", variant: "warning", state: "EXPIRED" };
  }
  if (isTaskLinkLocked(link.admin_locked)) {
    return { label: "ปิดใช้งาน", variant: "destructive", state: "LOCKED" };
  }

  if (link.status === "ACTIVE") {
    return { label: "ใช้งาน", variant: "success", state: "ACTIVE" };
  }

  return { label: getStatusLabel(link.status), variant: "secondary", state: "OTHER" };
}

export function getAttendanceStatusLabel(status: AttendanceTaskStatus | string): string {
  if (status === "P_ABSENT" || status === "2" || status === "ABSENT") return "ขาด";
  if (status === "P_LATE" || status === "3" || status === "LATE") return "สาย";
  return "มา";
}

export function buildLineShareUrl(url: string): string {
  return `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(url)}`;
}

export function copyText(value: string): void {
  void navigator.clipboard?.writeText(value);
}

/**
 * Rebuild a backend-issued task link onto the *current* origin (so it works even
 * when the API returns its own host, e.g. in dev) and drop any legacy `#/` hash
 * prefix. Keeps the link on our own domain — nothing is sent to a third party.
 */
export function normalizeTaskPublicLink(rawLink: string): string {
  if (!rawLink || typeof window === "undefined") {
    return rawLink;
  }
  try {
    const url = new URL(rawLink, window.location.origin);
    const path = url.hash.startsWith("#/") ? url.hash.slice(1) : url.pathname;
    return `${window.location.origin}${path}${url.search}`;
  } catch {
    return rawLink;
  }
}

/**
 * Public link to hand out for a created link. LOGIN links open the magic-login
 * page (so the holder is signed in with the assigned role); other types open the
 * guest task page.
 */
export function buildTaskResultLink(rawLink: string, isLoginLink: boolean): string {
  const normalized = normalizeTaskPublicLink(rawLink);
  return isLoginLink ? normalized.replace("/task/", "/login/magic/") : normalized;
}

/** Turn a stored (often relative) link into a full shareable URL. */
export function toAbsoluteUrl(value: string): string {
  if (!value) {
    return "";
  }
  if (/^https?:\/\//.test(value)) {
    return value;
  }
  if (typeof window === "undefined") {
    return value;
  }
  return `${window.location.origin}${value.startsWith("/") ? "" : "/"}${value}`;
}

// Re-exported from the shared lock module so login + attendance/visit links
// detect "closed" the same robust way (number 1 / string "1" / boolean true).
export { isLinkLocked } from "../../../lib/link-lock";
