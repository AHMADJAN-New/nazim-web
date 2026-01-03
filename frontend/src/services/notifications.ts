import { apiClient } from "@/lib/api/client";
import type { NotificationItem } from "@/types/notification";
import type { PaginatedResponse } from "@/types/pagination";

export interface NotificationListParams {
  page?: number;
  per_page?: number;
  unread_only?: boolean;
}

export const notificationsApi = {
  async list(params: NotificationListParams = {}): Promise<PaginatedResponse<NotificationItem> | NotificationItem[]> {
    return apiClient.get<PaginatedResponse<NotificationItem> | NotificationItem[]>('/notifications', { params });
  },
  async markRead(id: string): Promise<void> {
    await apiClient.post(`/notifications/${id}/read`, {});
  },
  async markAllRead(): Promise<void> {
    await apiClient.post('/notifications/read-all', {});
  },
  async unreadCount(): Promise<{ count: number }> {
    return apiClient.get<{ count: number }>('/notifications/unread-count');
  },
};
