import { apiClient } from "../../../lib/api-client";
import type { NotificationListResponse } from "../types/notifications.types";

async function getNotifications(params: {
  unread?: boolean;
  page?: number;
  limit?: number;
}): Promise<NotificationListResponse> {
  const response = await apiClient.get<NotificationListResponse>("/notifications", {
    params: {
      ...(params.unread ? { unread: "true" } : {}),
      ...(params.page ? { page: params.page } : {}),
      ...(params.limit ? { limit: params.limit } : {}),
    },
  });
  return response.data;
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

export const notificationsService = {
  getNotifications,
  markAllSeen,
  markRead,
  markAllRead,
};
