import { useRef, useState } from "react";
import { Bell, BellRing } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button, Skeleton } from "../../../components/base";
import { useDismissable } from "../../../hooks/useDismissable";
import { cn } from "../../../lib/utils";
import {
  useMarkAllRead,
  useMarkAllSeen,
  useMarkRead,
  useNotifications,
} from "../hooks/useNotifications";
import type { NotificationItem } from "../types/notifications.types";
import { NotificationListItem } from "./NotificationListItem";
import { getNotificationRoute } from "../lib/notification-navigation";

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const navigate = useNavigate();

  const { data, isLoading, isError } = useNotifications({ unreadOnly });
  const markAllSeen = useMarkAllSeen();
  const markRead = useMarkRead();
  const markAllRead = useMarkAllRead();

  const unseenCount = data?.unseenCount ?? 0;
  const unreadCount = data?.unreadCount ?? 0;
  const notifications = data?.rows ?? [];
  const BellIcon = unseenCount > 0 ? BellRing : Bell;

  useDismissable(open, containerRef, () => setOpen(false));

  function handleToggle(): void {
    const next = !open;
    setOpen(next);
    // Facebook-style: opening the tray acknowledges (clears) the number badge,
    // but items stay visually unread until actually clicked.
    if (next && unseenCount > 0) {
      markAllSeen.mutate();
    }
  }

  function handleOpenNotification(notification: NotificationItem): void {
    if (!notification.read_at) {
      markRead.mutate(notification.id);
    }
    setOpen(false);
    const route = getNotificationRoute(notification);
    if (route) {
      void navigate(route);
    }
  }

  return (
    <div className="relative" ref={containerRef}>
      <button
        aria-expanded={open}
        aria-haspopup="true"
        aria-label={
          unseenCount > 0 ? `รายการแจ้งเตือน (ใหม่ ${unseenCount} รายการ)` : "รายการแจ้งเตือน"
        }
        className={cn(
          "relative inline-flex size-10 items-center justify-center rounded-full bg-brand-soft text-primary-dark transition-colors hover:bg-brand-active focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
          open && "bg-brand-active text-primary",
        )}
        onClick={handleToggle}
        type="button"
      >
        <BellIcon className="size-5" strokeWidth={2.1} aria-hidden="true" />
        {unseenCount > 0 ? (
          <span className="absolute -right-1.5 -top-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-danger-400 px-1 text-xs font-bold leading-none text-white">
            {unseenCount > 99 ? "99+" : unseenCount}
          </span>
        ) : null}
      </button>
      {open ? (
        <div className="absolute right-0 top-12 z-40 w-[calc(100vw-2rem)] max-w-sm overflow-hidden rounded-xl border border-slate-200 bg-white text-slate-800 shadow-card">
          <div className="flex items-center justify-between gap-2 px-4 pb-2 pt-4">
            <span className="flex items-center gap-2 text-sm font-bold">
              <Bell className="size-4 shrink-0" aria-hidden="true" />
              การแจ้งเตือน
            </span>
            <Button
              className="text-xs"
              disabled={unreadCount === 0 || markAllRead.isPending}
              onClick={() => markAllRead.mutate()}
              size="sm"
              variant="ghost"
            >
              ทำเครื่องหมายว่าอ่านทั้งหมด
            </Button>
          </div>
          <div className="flex gap-1 px-4 pb-2" role="tablist">
            <button
              aria-selected={!unreadOnly}
              className={cn(
                "min-h-11 rounded-full px-3 py-1 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                !unreadOnly ? "bg-primary text-white" : "text-slate-500 hover:bg-slate-100",
              )}
              onClick={() => setUnreadOnly(false)}
              role="tab"
              type="button"
            >
              ทั้งหมด
            </button>
            <button
              aria-selected={unreadOnly}
              className={cn(
                "min-h-11 rounded-full px-3 py-1 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                unreadOnly ? "bg-primary text-white" : "text-slate-500 hover:bg-slate-100",
              )}
              onClick={() => setUnreadOnly(true)}
              role="tab"
              type="button"
            >
              ยังไม่อ่าน{unreadCount > 0 ? ` (${unreadCount})` : ""}
            </button>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {isError ? (
              <p className="px-4 py-6 text-center text-sm text-slate-500">
                โหลดการแจ้งเตือนไม่สำเร็จ
              </p>
            ) : isLoading ? (
              <div className="flex flex-col gap-3 px-4 py-4">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            ) : notifications.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-slate-500">
                {unreadOnly ? "ไม่มีการแจ้งเตือนที่ยังไม่อ่าน" : "ยังไม่มีการแจ้งเตือน"}
              </p>
            ) : (
              <ul>
                {notifications.map((notification) => (
                  <NotificationListItem
                    compact
                    key={notification.id}
                    notification={notification}
                    onOpen={handleOpenNotification}
                  />
                ))}
              </ul>
            )}
          </div>
          <div className="border-t border-slate-100 py-1 text-center">
            <button
              className="inline-flex min-h-11 items-center text-sm text-primary underline underline-offset-2 hover:text-primary-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              onClick={() => {
                setOpen(false);
                void navigate("/notifications");
              }}
              type="button"
            >
              แสดงรายการแจ้งเตือนทั้งหมด
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
