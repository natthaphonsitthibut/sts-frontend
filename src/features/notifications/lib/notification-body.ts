import type { NotificationItem } from "../types/notifications.types";

function normalizeText(value: string | null | undefined): string | null {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

/** Types that name a student and carry a one-line reason after the name. */
const STUDENT_NOTIFICATION_TYPES = new Set([
  "CASE_STATUS_CHANGED",
  "STUDENT_WATCHLIST_ALERT",
]);

export function formatNotificationBody(
  notification: NotificationItem,
): string | null {
  if (!STUDENT_NOTIFICATION_TYPES.has(notification.type_code)) {
    return normalizeText(notification.body);
  }

  const studentName = normalizeText(notification.student_name_snapshot);
  if (!studentName) return null;

  const reason = normalizeText(notification.reason_text);
  return [studentName, reason].filter(Boolean).join(" · ");
}
