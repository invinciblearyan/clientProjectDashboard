import { apiRequest } from './client';
import type { NotificationListResponse, UnreadCountResponse } from '../types/api';

export const notificationsApi = {
  list(): Promise<NotificationListResponse> {
    return apiRequest<NotificationListResponse>('/api/notifications');
  },

  unreadCount(): Promise<UnreadCountResponse> {
    return apiRequest<UnreadCountResponse>('/api/notifications/unread-count');
  },

  markRead(id: string): Promise<void> {
    return apiRequest<void>(`/api/notifications/${id}/read`, { method: 'PATCH' });
  },

  markAllRead(): Promise<void> {
    return apiRequest<void>('/api/notifications/read-all', { method: 'PATCH' });
  },
};
