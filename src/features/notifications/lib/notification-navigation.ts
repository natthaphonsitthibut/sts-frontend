import type { NotificationItem } from "../types/notifications.types";

export function getNotificationRoute(
  notification: NotificationItem,
): string | null {
  if (notification.ref_entity === "case") {
    // Without an id there is no longer a case list to fall back to — the
    // standalone case list page was retired in favor of the risk dashboard.
    return notification.ref_id
      ? `/cases/${encodeURIComponent(notification.ref_id)}`
      : null;
  }

  if (notification.ref_entity === "task") {
    // Without an id there is no longer a task-link list to fall back to —
    // per-classroom attendance links were retired.
    return notification.ref_id
      ? `/tasks/${encodeURIComponent(notification.ref_id)}`
      : null;
  }

  if (notification.ref_entity === "import") {
    return "/import-data/history";
  }

  if (notification.ref_entity === "student-account-batch") {
    return null;
  }

  return null;
}
