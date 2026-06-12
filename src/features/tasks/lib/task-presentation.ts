import type { AttendanceTaskStatus } from "../types/task.types";

export function formatDateTime(value?: string | null): string {
  if (!value) {
    return "-";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString("th-TH", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function formatDate(value?: string | null): string {
  if (!value) {
    return "-";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleDateString("th-TH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function getTaskTypeLabel(type?: string | null): string {
  if (type === "ATTENDANCE") return "เช็คชื่อ";
  if (type === "VISIT") return "ลงพื้นที่";
  if (type === "LOGIN") return "เข้าสู่ระบบ";
  return type || "-";
}

export function getStatusLabel(status?: string | null): string {
  if (status === "ACTIVE") return "ใช้งานได้";
  if (status === "LOCKED") return "ถูกล็อก";
  if (status === "EXPIRED") return "หมดอายุ";
  if (status === "COMPLETED") return "เสร็จสิ้น";
  if (status === "OPEN") return "เปิดเคส";
  if (status === "PENDING_REVIEW") return "รอตรวจ";
  if (status === "IN_PROGRESS") return "กำลังติดตาม";
  if (status === "AWAITING_HELP") return "รอช่วยเหลือ";
  if (status === "RESOLVED") return "ปิดเคส";
  return status || "-";
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

export function isLinkLocked(value: boolean | number | null | undefined): boolean {
  return value === true || value === 1;
}
