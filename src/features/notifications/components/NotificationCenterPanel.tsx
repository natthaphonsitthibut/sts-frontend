import { useEffect, useRef, useState } from "react";
import { Bell, CheckCheck, Trash2, X } from "lucide-react";
import { Button, Skeleton, useConfirm } from "../../../components/base";
import { useContextualNavigate } from "../../../components/layout/navigation-context";
import { cn } from "../../../lib/utils";
import {
  useMarkAllRead,
  useMarkAllSeen,
  useMarkRead,
  useDeleteAllRead,
  useNotifications,
} from "../hooks/useNotifications";
import { getNotificationRoute } from "../lib/notification-navigation";
import type {
  NotificationItem,
  NotificationReadStatus,
} from "../types/notifications.types";
import { NotificationListItem } from "./NotificationListItem";

interface NotificationCenterPanelProps {
  onOpenChange: (open: boolean) => void;
  open: boolean;
}

const STATUS_OPTIONS: Array<{ label: string; value: NotificationReadStatus }> =
  [
    { label: "ทั้งหมด", value: "all" },
    { label: "ยังไม่อ่าน", value: "unread" },
    { label: "อ่านแล้ว", value: "read" },
  ];

/**
 * The notification tray, anchored under the header bell like the account menu
 * next to it. The bell owns opening and dismissal; this renders the panel only
 * while `open`, and returns null otherwise so its query stays idle.
 */
export function NotificationCenterPanel({
  onOpenChange,
  open,
}: NotificationCenterPanelProps) {
  const [status, setStatus] = useState<NotificationReadStatus>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [locallyReadIds, setLocallyReadIds] = useState<Set<string>>(
    () => new Set(),
  );
  const hasMarkedSeen = useRef(false);
  const contextualNavigate = useContextualNavigate();
  const { data, isError, isLoading } = useNotifications({
    enabled: open,
    limit: 50,
    refetchInterval: false,
    status,
  });
  const markAllSeen = useMarkAllSeen();
  const markRead = useMarkRead({ invalidateOnSuccess: false });
  const markAllRead = useMarkAllRead();
  const deleteAllRead = useDeleteAllRead();
  const { confirm, dialog: confirmDialog } = useConfirm();
  const notifications = data?.rows ?? [];
  const displayedNotifications = notifications.map((notification) =>
    locallyReadIds.has(notification.id) && !notification.read_at
      ? { ...notification, read_at: new Date().toISOString() }
      : notification,
  );
  const unreadCount = Math.max(
    0,
    (data?.unreadCount ?? 0) -
      notifications.filter(
        (notification) =>
          !notification.read_at && locallyReadIds.has(notification.id),
      ).length,
  );
  const filteredCount =
    status === "unread" ? unreadCount : (data?.totalCount ?? 0);
  const availableReadCount =
    status === "read"
      ? (data?.totalCount ?? 0)
      : status === "all"
        ? Math.max(0, (data?.totalCount ?? 0) - unreadCount)
        : 0;
  const filteredCountLabel =
    status === "all"
      ? "รายการทั้งหมด"
      : status === "unread"
        ? "รายการที่ยังไม่ได้อ่าน"
        : "รายการที่อ่านแล้ว";

  useEffect(() => {
    if (!open) {
      hasMarkedSeen.current = false;
      return;
    }
    if (!hasMarkedSeen.current && data?.unseenCount) {
      hasMarkedSeen.current = true;
      markAllSeen.mutate(undefined, {
        onError: () => {
          hasMarkedSeen.current = false;
        },
      });
    }
  }, [data?.unseenCount, markAllSeen, open]);

  function handleToggleNotification(notification: NotificationItem): void {
    if (!notification.read_at) {
      setLocallyReadIds((current) => new Set(current).add(notification.id));
      markRead.mutate(notification.id, {
        onError: () => {
          setLocallyReadIds((current) => {
            const next = new Set(current);
            next.delete(notification.id);
            return next;
          });
        },
      });
    }
    setExpandedId((current) =>
      current === notification.id ? null : notification.id,
    );
  }

  function handleOpenChange(nextOpen: boolean): void {
    if (!nextOpen) {
      setExpandedId(null);
      setLocallyReadIds(new Set());
    }
    onOpenChange(nextOpen);
  }

  function handleOpenRelated(notification: NotificationItem): void {
    const route = getNotificationRoute(notification);
    if (!route) return;
    handleOpenChange(false);
    contextualNavigate(route);
  }

  async function handleDeleteAllRead(): Promise<void> {
    const confirmed = await confirm({
      title: "ลบรายการที่อ่านแล้ว",
      description:
        "รายการที่อ่านแล้วทั้งหมดจะถูกลบออกจากบัญชีนี้ และไม่สามารถกู้คืนได้",
      confirmText: "ลบรายการ",
      variant: "destructive",
    });
    if (!confirmed) return;
    deleteAllRead.mutate();
  }

  if (!open) return null;

  return (
    <div
      aria-label="การแจ้งเตือน"
      // A fixed height, not a max: filtering to อ่านแล้ว returns fewer rows, and a
      // content-sized tray would shrink under the cursor on every tab press.
      className="absolute right-0 top-full z-50 mt-2 flex h-[min(38rem,calc(100dvh-5rem))] w-[min(32rem,calc(100vw-5rem))] flex-col overflow-hidden rounded-lg border border-slate-200 bg-white text-slate-700 shadow-lg"
      id="notification-center"
      role="region"
    >
      <div className="flex min-h-14 items-start justify-between gap-2 border-b border-slate-200 px-5 py-4">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="flex items-center gap-2 text-base font-semibold text-slate-900">
            <Bell aria-hidden="true" className="size-5" />
            การแจ้งเตือน
          </span>
          <span className="text-sm text-content-secondary">
            {filteredCount.toLocaleString("th-TH")} {filteredCountLabel}
          </span>
        </div>
        <button
          aria-label="ปิดการแจ้งเตือน"
          className="-mr-1.5 -mt-1 flex size-9 shrink-0 items-center justify-center rounded-full text-content-secondary transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          onClick={() => handleOpenChange(false)}
          type="button"
        >
          <X aria-hidden="true" className="size-4.5" />
        </button>
      </div>

      {/* The tab row and the list share one 12px rhythm: no bottom padding
          here, 12px on top of the list, so the gap above the first row equals
          the gap between rows. */}
      <div className="px-4 pt-3">
        <div
          aria-label="ตัวกรองการแจ้งเตือน"
          className="flex w-full rounded-full border border-slate-200 bg-white p-1"
          role="tablist"
        >
          {STATUS_OPTIONS.map((option) => {
            const active = status === option.value;
            return (
              <button
                aria-controls="notification-center-panel"
                aria-selected={active}
                className={cn(
                  "min-h-10 flex-1 rounded-full px-3 text-sm font-semibold transition-colors duration-150 ease-out motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                  active
                    ? "bg-primary text-white"
                    : "text-content-secondary hover:bg-primary-soft hover:text-primary-dark",
                )}
                key={option.value}
                id={`notification-center-tab-${option.value}`}
                onClick={() => {
                  setExpandedId(null);
                  setStatus(option.value);
                }}
                role="tab"
                type="button"
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>

      <div
        aria-labelledby={`notification-center-tab-${status}`}
        className="min-h-0 flex-1 overflow-y-auto bg-white px-4 pb-4 pt-3"
        id="notification-center-panel"
        role="tabpanel"
      >
        {isError ? (
          <p className="py-10 text-center text-sm text-content-secondary">
            โหลดการแจ้งเตือนไม่สำเร็จ กรุณาลองใหม่อีกครั้ง
          </p>
        ) : isLoading ? (
          <div className="space-y-3">
            {["first", "second", "third"].map((key) => (
              <Skeleton className="h-24 w-full" key={key} />
            ))}
          </div>
        ) : displayedNotifications.length === 0 ? (
          <p className="py-10 text-center text-sm text-content-secondary">
            {status === "unread"
              ? "ไม่มีการแจ้งเตือนที่ยังไม่อ่าน"
              : status === "read"
                ? "ยังไม่มีการแจ้งเตือนที่อ่านแล้ว"
                : "ยังไม่มีการแจ้งเตือน"}
          </p>
        ) : (
          <ul className="space-y-3">
            {displayedNotifications.map((notification) => {
              const route = getNotificationRoute(notification);
              return (
                <NotificationListItem
                  className="overflow-hidden rounded-lg border border-slate-200 bg-white"
                  key={notification.id}
                  expandable
                  expanded={expandedId === notification.id}
                  notification={notification}
                  onOpen={handleToggleNotification}
                  onOpenRelated={route ? handleOpenRelated : undefined}
                  presentation="center"
                />
              );
            })}
          </ul>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-7 py-4 sm:px-8">
        <Button
          disabled={
            unreadCount === 0 ||
            markAllRead.isPending ||
            deleteAllRead.isPending
          }
          icon={CheckCheck}
          isLoading={markAllRead.isPending}
          loadingText="กำลังบันทึก"
          onClick={() => markAllRead.mutate()}
          size="sm"
          variant="outline"
        >
          ทำเครื่องหมายว่าอ่านทั้งหมด
        </Button>
        <Button
          disabled={
            availableReadCount === 0 ||
            deleteAllRead.isPending ||
            markAllRead.isPending ||
            markRead.isPending
          }
          icon={Trash2}
          isLoading={deleteAllRead.isPending}
          loadingText="กำลังลบ"
          onClick={() => void handleDeleteAllRead()}
          size="sm"
          variant="destructive"
        >
          ลบรายการที่อ่านแล้ว
        </Button>
      </div>
      {confirmDialog}
    </div>
  );
}
