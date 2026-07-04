import { cn } from "../../../lib/utils";
import { formatThaiRelativeTime } from "../../../lib/date-time";
import { Badge } from "../../../components/base";
import type { NotificationItem } from "../types/notifications.types";

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

  return (
    <li>
      <button
        className={cn(
          "flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary",
          isUnread && "bg-primary-soft/60 hover:bg-primary-soft",
        )}
        onClick={() => onOpen(notification)}
        type="button"
      >
        <span className="min-w-0 flex-1">
          {showType && notification.type_label ? (
            <Badge className="mb-2" variant="secondary">
              {notification.type_label}
            </Badge>
          ) : null}
          <span
            className={cn(
              "block break-words text-sm text-slate-800",
              compact && "truncate",
              isUnread ? "font-semibold" : "font-medium",
            )}
          >
            {notification.title}
          </span>
          {notification.body ? (
            <span
              className={cn(
                "mt-0.5 block break-words text-xs text-slate-500",
                compact && "truncate",
              )}
            >
              {notification.body}
            </span>
          ) : null}
          <span className={cn("mt-1 block text-xs", isUnread ? "text-primary" : "text-slate-400")}>
            {formatThaiRelativeTime(notification.created_at)}
          </span>
        </span>
        {isUnread ? (
          <span
            aria-label="ยังไม่อ่าน"
            className="mt-1.5 size-2.5 shrink-0 rounded-full bg-primary"
            role="status"
          />
        ) : null}
      </button>
    </li>
  );
}
