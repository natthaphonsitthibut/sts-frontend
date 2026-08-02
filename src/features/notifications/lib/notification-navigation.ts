import type { NotificationItem } from "../types/notifications.types";

export function getNotificationRoute(notification: NotificationItem): string | null {
  if (notification.ref_entity === "case") {
    return notification.ref_id
      ? `/cases/${encodeURIComponent(notification.ref_id)}`
      : "/cases";
  }

  if (notification.ref_entity === "task") {
    return notification.ref_id
      ? `/tasks/${encodeURIComponent(notification.ref_id)}`
      : "/attendance-links";
  }

  if (notification.ref_entity === "import") {
    return "/import-data/history";
  }

  if (notification.ref_entity === "student-account-batch") {
    return null;
  }

  return null;
}
