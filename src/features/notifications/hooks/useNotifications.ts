import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { notificationsService } from "../api/notifications.service";
import type { NotificationReadStatus } from "../types/notifications.types";

export const NOTIFICATIONS_QUERY_KEY = "notifications";

const POLL_INTERVAL_MS = 30_000;

export function useNotifications(options: {
  enabled?: boolean;
  status?: NotificationReadStatus;
  page?: number;
  limit?: number;
  refetchInterval?: number | false;
}) {
  const status = options.status ?? "all";

  return useQuery({
    queryKey: [
      NOTIFICATIONS_QUERY_KEY,
      { status, page: options.page ?? 1, limit: options.limit ?? 10 },
    ],
    queryFn: () =>
      notificationsService.getNotifications({
        status,
        page: options.page,
        limit: options.limit ?? 10,
      }),
    enabled: options.enabled ?? true,
    refetchOnMount: "always",
    refetchInterval: options.refetchInterval ?? POLL_INTERVAL_MS,
  });
}

function useInvalidateNotifications() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: [NOTIFICATIONS_QUERY_KEY] });
  };
}

export function useMarkAllSeen() {
  const invalidate = useInvalidateNotifications();
  return useMutation({
    mutationFn: notificationsService.markAllSeen,
    onSuccess: invalidate,
    meta: { suppressSuccessToast: true },
  });
}

export function useMarkRead(options: { invalidateOnSuccess?: boolean } = {}) {
  const invalidate = useInvalidateNotifications();
  return useMutation({
    mutationFn: notificationsService.markRead,
    onSuccess: options.invalidateOnSuccess === false ? undefined : invalidate,
    meta: { suppressSuccessToast: true },
  });
}

export function useMarkAllRead() {
  const invalidate = useInvalidateNotifications();
  return useMutation({
    mutationFn: notificationsService.markAllRead,
    onSuccess: invalidate,
    meta: { suppressSuccessToast: true },
  });
}

export function useDeleteAllRead() {
  const invalidate = useInvalidateNotifications();
  return useMutation({
    mutationFn: notificationsService.deleteAllRead,
    onSuccess: invalidate,
    meta: { successMessage: "ลบรายการที่อ่านแล้ว" },
  });
}
