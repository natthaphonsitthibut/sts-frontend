import type { NotificationItem } from "../types/notifications.types";

function normalizeText(value: string | null | undefined): string | null {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

export function formatNotificationBody(notification: NotificationItem): string | null {
  if (notification.type_code !== "CASE_STATUS_CHANGED") {
    return normalizeText(notification.body);
  }

  const studentName = normalizeText(notification.student_name_masked);
  if (!studentName) return null;

  const reason = normalizeText(notification.reason_text);
  return [studentName, reason].filter(Boolean).join(" · ");
}
