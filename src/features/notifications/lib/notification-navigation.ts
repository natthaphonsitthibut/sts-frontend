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

  if (notification.ref_entity === "classroom_student_comments") {
    // A watchlist alert opens the student it is about, like the กลุ่มเฝ้าระวัง
    // tab does.
    return notification.student_uuid
      ? `/students/${encodeURIComponent(notification.student_uuid)}`
      : null;
  }

  return null;
}
