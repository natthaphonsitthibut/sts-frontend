import { apiClient } from "../../../lib/api-client";
import type {
  NotificationListResponse,
  NotificationReadStatus,
} from "../types/notifications.types";

type NotificationListApiResponse = NotificationListResponse & {
  total_count?: number;
  unread_count?: number;
  unseen_count?: number;
};

async function getNotifications(params: {
  status?: NotificationReadStatus;
  page?: number;
  limit?: number;
}): Promise<NotificationListResponse> {
  const response = await apiClient.get<NotificationListApiResponse>("/notifications", {
    params: {
      ...(params.status && params.status !== "all" ? { status: params.status } : {}),
      ...(params.page ? { page: params.page } : {}),
      ...(params.limit ? { limit: params.limit } : {}),
    },
  });
  const data = response.data;
  return {
    ...data,
    totalCount: data.totalCount ?? data.total_count ?? 0,
    unreadCount: data.unreadCount ?? data.unread_count ?? 0,
    unseenCount: data.unseenCount ?? data.unseen_count ?? 0,
  };
}

async function markAllSeen(): Promise<void> {
  await apiClient.patch("/notifications/seen");
}

async function markRead(id: string): Promise<void> {
  await apiClient.patch(`/notifications/${encodeURIComponent(id)}/read`);
}

async function markAllRead(): Promise<void> {
  await apiClient.patch("/notifications/read-all");
}

async function deleteAllRead(): Promise<void> {
  await apiClient.delete("/notifications/read");
}

export const notificationsService = {
  getNotifications,
  markAllSeen,
  markRead,
  markAllRead,
  deleteAllRead,
};
