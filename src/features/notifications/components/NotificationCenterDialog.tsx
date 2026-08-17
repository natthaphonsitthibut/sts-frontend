import { useEffect, useRef, useState } from "react";
import { Bell, CheckCheck, Trash2 } from "lucide-react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Skeleton,
  useConfirm,
} from "../../../components/base";
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

interface NotificationCenterDialogProps {
  onOpenChange: (open: boolean) => void;
  open: boolean;
}

const STATUS_OPTIONS: Array<{ label: string; value: NotificationReadStatus }> = [
  { label: "ทั้งหมด", value: "all" },
  { label: "ยังไม่อ่าน", value: "unread" },
  { label: "อ่านแล้ว", value: "read" },
];

export function NotificationCenterDialog({
  onOpenChange,
  open,
}: NotificationCenterDialogProps) {
  const [status, setStatus] = useState<NotificationReadStatus>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [locallyReadIds, setLocallyReadIds] = useState<Set<string>>(() => new Set());
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
      notifications.filter((notification) => !notification.read_at && locallyReadIds.has(notification.id))
        .length,
  );
  const filteredCount = status === "unread" ? unreadCount : (data?.totalCount ?? 0);
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
    setExpandedId((current) => (current === notification.id ? null : notification.id));
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
      description: "รายการที่อ่านแล้วทั้งหมดจะถูกลบออกจากบัญชีนี้ และไม่สามารถกู้คืนได้",
      confirmText: "ลบรายการ",
      variant: "destructive",
    });
    if (!confirmed) return;
    deleteAllRead.mutate();
  }

  return (
    <Dialog onOpenChange={handleOpenChange} open={open}>
      <DialogContent
        className="flex h-[90vh] max-w-4xl flex-col overflow-hidden p-0"
        onClose={() => handleOpenChange(false)}
      >
        <DialogHeader className="m-0 min-h-14 px-6 py-4 pr-14">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <DialogTitle icon={Bell}>การแจ้งเตือน</DialogTitle>
            <span className="text-sm text-content-secondary">
              {filteredCount.toLocaleString("th-TH")} {filteredCountLabel}
            </span>
          </div>
        </DialogHeader>

        <div className="flex justify-center px-5 py-2 sm:px-6">
          <div
            aria-label="ตัวกรองการแจ้งเตือน"
            className="inline-flex rounded-full border border-slate-200 bg-white p-1"
            role="tablist"
          >
            {STATUS_OPTIONS.map((option) => {
              const active = status === option.value;
              return (
                <button
                  aria-controls="notification-center-panel"
                  aria-selected={active}
                  className={cn(
                    "min-h-11 min-w-28 rounded-full px-5 text-sm font-semibold transition-colors duration-150 ease-out motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
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
          className="min-h-0 flex-1 overflow-y-auto bg-white p-4 sm:p-5"
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
              unreadCount === 0 || markAllRead.isPending || deleteAllRead.isPending
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
      </DialogContent>
    </Dialog>
  );
}
