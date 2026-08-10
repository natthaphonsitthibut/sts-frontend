import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Bell, CheckCheck } from "lucide-react";
import { Button, Tabs } from "../../../components/base";
import {
  EmptyState,
  ErrorState,
  PageShell,
  PageToolbar,
  SkeletonStack,
} from "../../../components/layout/page-primitives";
import { Pagination } from "../../../components/layout/pagination";
import { RefreshButton } from "../../../components/layout/refresh-button";
import { useContextualNavigate } from "../../../components/layout/navigation-context";
import { ClearFiltersButton } from "../../../components/layout/clear-filters-button";
import { DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS } from "../../../lib/pagination";
import { NotificationListItem } from "../components/NotificationListItem";
import {
  useMarkAllRead,
  useMarkAllSeen,
  useMarkRead,
  useNotifications,
} from "../hooks/useNotifications";
import { getNotificationRoute } from "../lib/notification-navigation";
import type { NotificationItem } from "../types/notifications.types";

export function NotificationsPage() {
  const contextualNavigate = useContextualNavigate();
  const hasMarkedSeen = useRef(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const status = searchParams.get("status");
  const unreadOnly = status === "unread";
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState<number>(DEFAULT_PAGE_SIZE);
  const { data, isError, isLoading, refetch, dataUpdatedAt } = useNotifications(
    {
      unreadOnly,
      page,
      limit: rowsPerPage,
    },
  );
  const markAllSeen = useMarkAllSeen();
  const markRead = useMarkRead();
  const markAllRead = useMarkAllRead();

  useEffect(() => {
    if (status !== "all" && status !== "unread") {
      setSearchParams({ status: "all" }, { replace: true });
    }
  }, [setSearchParams, status]);

  const notifications = data?.rows ?? [];
  const unreadCount = data?.unreadCount ?? 0;
  const totalCount = data?.totalCount ?? 0;

  useEffect(() => {
    if (!hasMarkedSeen.current && data && data.unseenCount > 0) {
      hasMarkedSeen.current = true;
      markAllSeen.mutate();
    }
  }, [data, markAllSeen]);

  function handleFilterChange(value: string): void {
    setSearchParams({ status: value === "unread" ? "unread" : "all" });
    setPage(1);
  }

  function handleRowsPerPageChange(nextRowsPerPage: number): void {
    setRowsPerPage(nextRowsPerPage);
    setPage(1);
  }

  function handleOpenNotification(notification: NotificationItem): void {
    if (!notification.read_at) {
      markRead.mutate(notification.id);
    }
    const route = getNotificationRoute(notification);
    if (route) {
      contextualNavigate(route);
    }
  }

  return (
    <PageShell>
      <PageToolbar
        actions={
          <Button
            disabled={unreadCount === 0}
            icon={CheckCheck}
            isLoading={markAllRead.isPending}
            loadingText="กำลังบันทึก"
            onClick={() =>
              markAllRead.mutate(undefined, {
                onSuccess: () => setPage(1),
              })
            }
            variant="outline"
          >
            อ่านทั้งหมด
          </Button>
        }
        navigation={
          <Tabs
            aria-label="ตัวกรองการแจ้งเตือน"
            onChange={handleFilterChange}
            options={[
              { value: "all", label: "ทั้งหมด" },
              {
                value: "unread",
                label:
                  unreadCount > 0
                    ? `ยังไม่อ่าน (${unreadCount})`
                    : "ยังไม่อ่าน",
              },
            ]}
            value={unreadOnly ? "unread" : "all"}
          />
        }
        description="รายการเหตุการณ์สำคัญตามขอบเขตข้อมูลและสิทธิ์ของบัญชีนี้"
        footerActions={
          <>
            <RefreshButton onRefresh={refetch} updatedAt={dataUpdatedAt} />
            <ClearFiltersButton
              onClear={() => {
                setSearchParams({ status: "all" });
                setPage(1);
              }}
            />
          </>
        }
        icon={Bell}
        title="การแจ้งเตือน"
      />

      {isError ? (
        <ErrorState
          description="เกิดข้อผิดพลาดระหว่างโหลดรายการแจ้งเตือน"
          onRetry={() => void refetch()}
          title="ไม่สามารถโหลดการแจ้งเตือนได้"
        />
      ) : isLoading ? (
        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <SkeletonStack lines={6} />
        </div>
      ) : notifications.length === 0 ? (
        <EmptyState
          description={
            unreadOnly
              ? "การแจ้งเตือนทั้งหมดถูกอ่านแล้ว"
              : "เมื่อมีเหตุการณ์ที่เกี่ยวข้อง รายการจะแสดงที่หน้านี้"
          }
          icon={Bell}
          title={
            unreadOnly
              ? "ไม่มีการแจ้งเตือนที่ยังไม่อ่าน"
              : "ยังไม่มีการแจ้งเตือน"
          }
        />
      ) : (
        <div className="space-y-4">
          <section
            aria-label="รายการการแจ้งเตือน"
            className="overflow-hidden rounded-lg border border-slate-200 bg-white"
          >
            <ul className="divide-y divide-slate-100">
              {notifications.map((notification) => (
                <NotificationListItem
                  key={notification.id}
                  notification={notification}
                  onOpen={handleOpenNotification}
                  showType
                />
              ))}
            </ul>
          </section>
          <Pagination
            onPageChange={setPage}
            onRowsPerPageChange={handleRowsPerPageChange}
            page={page}
            rowsPerPage={rowsPerPage}
            rowsPerPageOptions={PAGE_SIZE_OPTIONS}
            totalCount={totalCount}
            unitLabel="รายการ"
          />
        </div>
      )}
    </PageShell>
  );
}
