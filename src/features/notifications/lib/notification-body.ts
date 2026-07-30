import type { NotificationItem } from "../types/notifications.types";

const STRUCTURED_STUDENT_NOTIFICATION_TYPES = new Set([
  "CASE_CREATED",
  "CASE_STATUS_CHANGED",
  "CASE_SLA_WARNING",
  "CASE_SLA_BREACHED",
  "CASE_RISK_ESCALATED",
  "STUDENT_RISK_WATCH",
]);

function normalizeText(value: string | null | undefined): string | null {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

export function formatNotificationBody(notification: NotificationItem): string | null {
  if (!STRUCTURED_STUDENT_NOTIFICATION_TYPES.has(notification.type_code)) {
    return normalizeText(notification.body);
  }

  const studentName = normalizeText(notification.student_name_masked);
  if (!studentName) return null;

  const reason = normalizeText(notification.reason_text);
  switch (notification.type_code) {
    case "CASE_CREATED":
      return [studentName, reason].filter(Boolean).join(" · ");
    case "CASE_STATUS_CHANGED":
    case "CASE_SLA_WARNING":
    case "CASE_SLA_BREACHED":
      return `เคสของ ${studentName}`;
    case "CASE_RISK_ESCALATED":
      return [`เคสของ ${studentName}`, reason].filter(Boolean).join(" · ");
    case "STUDENT_RISK_WATCH":
      return [`เฝ้าระวัง ${studentName}`, reason].filter(Boolean).join(" · ");
    default:
      return null;
  }
}
