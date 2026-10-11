import type { NotificationItem } from "../types/notifications.types";

/** `can` from `usePermissions` — what the signed-in account may open. */
export type NotificationCapabilityCheck = (permissionId: string) => boolean;

/**
 * What each destination's route asks for, mirroring `app/router.tsx`. A
 * notification only links where the account can actually land; anything else
 * would send it to /forbidden.
 */
type NotificationDestination =
  | "case"
  | "student"
  | "watchlistReport"
  | "teacherCommentReport";

const DESTINATION_PERMISSIONS: Record<
  NotificationDestination,
  readonly string[]
> = {
  case: ["dashboard"],
  student: ["students", "manage-students", "classrooms"],
  watchlistReport: ["dashboard"],
  teacherCommentReport: ["dashboard", "students"],
};

const WATCHLIST_REPORT_ROUTE = "/student-risk-report/watchlist";
const TEACHER_COMMENT_REPORT_ROUTE = "/student-risk-report/teacher-comments";

function canOpen(
  can: NotificationCapabilityCheck,
  destination: NotificationDestination,
): boolean {
  return DESTINATION_PERMISSIONS[destination].some((permissionId) =>
    can(permissionId),
  );
}

/**
 * Where a notification leads for this account, or null when it has nowhere to
 * go. The inbox page and the header tray both resolve through here.
 */
export function getNotificationRoute(
  notification: NotificationItem,
  can: NotificationCapabilityCheck,
): string | null {
  if (notification.ref_entity === "case") {
    // Without an id there is no longer a case list to fall back to — the
    // standalone case list page was retired in favor of the risk dashboard.
    return notification.ref_id && canOpen(can, "case")
      ? `/cases/${encodeURIComponent(notification.ref_id)}`
      : null;
  }

  if (notification.ref_entity === "classroom_student_comments") {
    // A watchlist alert opens the student it is about, like the กลุ่มเฝ้าระวัง
    // tab does.
    if (notification.student_uuid && canOpen(can, "student")) {
      return `/students/${encodeURIComponent(notification.student_uuid)}`;
    }
    // The student is outside what this account can open (no profile access, or
    // no enrollment in its scope): land on the watchlist report it can reach,
    // which lists the same alert within the account's own scope.
    if (canOpen(can, "watchlistReport")) return WATCHLIST_REPORT_ROUTE;
    if (canOpen(can, "teacherCommentReport")) {
      return TEACHER_COMMENT_REPORT_ROUTE;
    }
    return null;
  }

  return null;
}
