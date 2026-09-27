import { Eye, TriangleAlert, type LucideIcon } from "lucide-react";
import { getCaseTrackingStatusPresentation } from "../../cases/lib/case-presentation";
import type { NotificationItem } from "../types/notifications.types";

interface NotificationIconPresentation {
  icon: LucideIcon;
  iconSurfaceClassName: string;
}

/**
 * A watchlist alert wears its comment level the way the กลุ่มเฝ้าระวัง tab
 * does — ควรเฝ้าดู an eye in the เฝ้าระวัง orange, น่ากังวล a warning triangle
 * in danger red. A case notification wears its case status.
 */
const WATCHLIST_ALERT_PRESENTATION: Record<
  string,
  NotificationIconPresentation
> = {
  WATCH: { icon: Eye, iconSurfaceClassName: "bg-brand-orange text-white" },
  CONCERN: {
    icon: TriangleAlert,
    iconSurfaceClassName: "bg-danger text-white",
  },
};

export function getNotificationIconPresentation(
  notification: NotificationItem,
): NotificationIconPresentation {
  if (notification.type_code === "STUDENT_WATCHLIST_ALERT") {
    return (
      WATCHLIST_ALERT_PRESENTATION[notification.concern_level_code ?? ""] ??
      WATCHLIST_ALERT_PRESENTATION.WATCH
    );
  }
  return getCaseTrackingStatusPresentation(notification.case_status_code);
}
