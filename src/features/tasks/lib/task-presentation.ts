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

export function isLinkLocked(value: boolean | number | null | undefined): boolean {
  return value === true || value === 1;
}
