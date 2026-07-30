import { AlertTriangle, CheckCircle2, Info } from "lucide-react";
import { cn } from "../../../lib/utils";
import { formatThaiRelativeTime } from "../../../lib/date-time";
import { Badge } from "../../../components/base";
import type { NotificationItem } from "../types/notifications.types";
import {
  getNotificationSeverity,
  getNotificationSeverityClassName,
} from "../lib/notification-severity";
import { formatNotificationBody } from "../lib/notification-body";

interface NotificationListItemProps {
  compact?: boolean;
  notification: NotificationItem;
  onOpen: (notification: NotificationItem) => void;
  showType?: boolean;
}

export function NotificationListItem({
  compact = false,
  notification,
  onOpen,
  showType = false,
}: NotificationListItemProps) {
  const isUnread = !notification.read_at;
  const severity = getNotificationSeverity(notification.type_code);
  const body = formatNotificationBody(notification);
  const SeverityIcon =
    severity === "success" ? CheckCircle2 : severity === "info" ? Info : AlertTriangle;

  return (
    <li>
      <button
        className={cn(
          "flex w-full items-start gap-3 px-4 py-4 text-left transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary",
          isUnread && "bg-primary-soft/60 hover:bg-primary-soft",
        )}
        onClick={() => onOpen(notification)}
        type="button"
      >
        <span
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-full",
            getNotificationSeverityClassName(notification.type_code),
          )}
        >
          <SeverityIcon className="size-5" aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          {showType && notification.type_label ? (
            <Badge className="mb-2" variant="secondary">
              {notification.type_label}
            </Badge>
          ) : null}
          <span className="flex items-start justify-between gap-2">
            <span
              className={cn(
                "break-words text-sm text-slate-800",
                compact && "truncate",
                isUnread ? "font-semibold" : "font-medium",
              )}
            >
              {notification.title}
            </span>
            <span className="mt-0.5 flex shrink-0 items-center gap-1.5 whitespace-nowrap text-xs text-slate-500">
              {formatThaiRelativeTime(notification.created_at)}
              {isUnread ? (
                <span
                  aria-label="ยังไม่อ่าน"
                  className="size-2 rounded-full bg-success"
                  role="status"
                />
              ) : null}
            </span>
          </span>
          {body ? (
            <span
              className={cn(
                "mt-0.5 block break-words text-xs text-slate-500",
                compact && "truncate",
              )}
            >
              {body}
            </span>
          ) : null}
        </span>
      </button>
    </li>
  );
}
