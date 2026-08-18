import {
  ChevronDown,
  Clock3,
  ExternalLink,
  Mail,
  MailOpen,
} from "lucide-react";
import { cn } from "../../../lib/utils";
import { formatThaiRelativeTime } from "../../../lib/date-time";
import { Badge } from "../../../components/base";
import { Button } from "../../../components/base";
import type { NotificationItem } from "../types/notifications.types";
import { formatNotificationBody } from "../lib/notification-body";
import { getCaseTrackingStatusPresentation } from "../../cases/lib/case-presentation";

interface NotificationListItemProps {
  className?: string;
  compact?: boolean;
  expandable?: boolean;
  expanded?: boolean;
  notification: NotificationItem;
  onOpen: (notification: NotificationItem) => void;
  onOpenRelated?: (notification: NotificationItem) => void;
  presentation?: "default" | "center";
  showType?: boolean;
}

export function NotificationListItem({
  className,
  compact = false,
  expandable = false,
  expanded = false,
  notification,
  onOpen,
  onOpenRelated,
  presentation = "default",
  showType = false,
}: NotificationListItemProps) {
  const isUnread = !notification.read_at;
  const body = formatNotificationBody(notification);
  const centerPresentation = presentation === "center";
  const statusPresentation = getCaseTrackingStatusPresentation(
    notification.case_status_code,
  );
  const StatusIcon = statusPresentation.icon;

  return (
    <li className={cn(className, expanded && "border-primary")}>
      <button
        className={cn(
          "flex w-full items-start gap-3 px-4 py-4 text-left transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary",
          // The tray shows the collapsed row only; detail is one click away, so
          // the row stays short enough to fit several without scrolling.
          centerPresentation && "items-center gap-3 px-4 py-2",
          expanded
            ? "bg-white hover:bg-white"
            : isUnread
              ? "bg-brand-soft hover:bg-brand-active"
              : centerPresentation && "bg-white hover:bg-brand-soft",
        )}
        aria-expanded={expandable ? expanded : undefined}
        onClick={() => onOpen(notification)}
        type="button"
      >
        <span
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-full",
            centerPresentation && "size-10 rounded-lg",
            statusPresentation.iconSurfaceClassName,
          )}
        >
          <StatusIcon className="size-5" aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          {showType && notification.type_label ? (
            <Badge className="mb-2" variant="secondary">
              {notification.type_label}
            </Badge>
          ) : null}
          {centerPresentation ? (
            <>
              <span className="flex items-start gap-2">
                <span
                  className={cn(
                    "min-w-0 flex-1 break-words text-sm leading-5 text-content-primary",
                    isUnread ? "font-bold" : "font-semibold",
                  )}
                >
                  {notification.title}
                </span>
                {isUnread ? (
                  <span
                    aria-label="ยังไม่อ่าน"
                    className="mt-1 size-2 shrink-0 rounded-full bg-primary"
                    role="status"
                  />
                ) : null}
                {expandable ? (
                  <ChevronDown
                    aria-hidden="true"
                    className={cn(
                      "mt-0.5 size-5 shrink-0 transition-transform duration-150 ease-out motion-reduce:transition-none",
                      expanded && "rotate-180",
                    )}
                  />
                ) : null}
              </span>
              {body ? (
                <span className="mt-0.5 block truncate text-sm text-content-secondary">
                  {body}
                </span>
              ) : null}
              {/* The tray keeps this line as plain meta text: a Badge here adds
                  a row of chrome to every notification, and the unread dot on
                  the title already carries the state. */}
              <span className="mt-1 flex items-center gap-3 text-xs text-content-secondary">
                <span className="inline-flex items-center gap-1.5">
                  <Clock3 aria-hidden="true" className="size-3.5" />
                  {formatThaiRelativeTime(notification.created_at)}
                </span>
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5",
                    isUnread && "font-semibold text-primary",
                  )}
                >
                  {isUnread ? (
                    <Mail aria-hidden="true" className="size-3.5" />
                  ) : (
                    <MailOpen aria-hidden="true" className="size-3.5" />
                  )}
                  {isUnread ? "ยังไม่อ่าน" : "อ่านแล้ว"}
                </span>
              </span>
            </>
          ) : (
            <>
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
                  {expandable ? (
                    <ChevronDown
                      aria-hidden="true"
                      className={cn(
                        "size-4 transition-transform duration-150 ease-out motion-reduce:transition-none",
                        expanded && "rotate-180",
                      )}
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
            </>
          )}
        </span>
      </button>
      {expandable && expanded ? (
        <div
          className={cn(
            "border-t border-slate-200 px-4 pb-4 pt-3",
            centerPresentation && "px-6 pb-5 pt-4",
            "bg-white",
          )}
        >
          {body ? (
            <p className="text-sm text-content-secondary">{body}</p>
          ) : null}
          {onOpenRelated ? (
            <Button
              className="mt-3"
              icon={ExternalLink}
              onClick={() => onOpenRelated(notification)}
              size="sm"
              variant="outline"
            >
              ไปยังหน้าที่เกี่ยวข้อง
            </Button>
          ) : null}
        </div>
      ) : null}
    </li>
  );
}
