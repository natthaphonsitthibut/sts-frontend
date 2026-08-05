import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { notificationsService } from "../api/notifications.service";

export const NOTIFICATIONS_QUERY_KEY = "notifications";

const POLL_INTERVAL_MS = 30_000;

export function useNotifications(options: {
  unreadOnly: boolean;
  page?: number;
  limit?: number;
}) {
  return useQuery({
    queryKey: [
      NOTIFICATIONS_QUERY_KEY,
      { unread: options.unreadOnly, page: options.page ?? 1, limit: options.limit ?? 10 },
    ],
    queryFn: () =>
      notificationsService.getNotifications({
        unread: options.unreadOnly,
        page: options.page,
        limit: options.limit ?? 10,
      }),
    refetchInterval: POLL_INTERVAL_MS,
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

export function useMarkRead() {
  const invalidate = useInvalidateNotifications();
  return useMutation({
    mutationFn: notificationsService.markRead,
    onSuccess: invalidate,
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
