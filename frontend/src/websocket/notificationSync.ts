import type { QueryClient } from '@tanstack/react-query';
import { queryKeys } from '../api/queryKeys';
import type { Notification, NotificationListResponse } from '../types/api';
import type { NotificationPayload } from './socketEvents';

function toNotification(payload: NotificationPayload): Notification {
  return {
    id: payload.id,
    type: payload.type,
    title: payload.title,
    message: payload.message,
    projectId: payload.projectId,
    taskId: payload.taskId,
    isRead: payload.isRead,
    readAt: payload.readAt,
    createdAt:
      typeof payload.createdAt === 'string'
        ? payload.createdAt
        : new Date(payload.createdAt).toISOString(),
  };
}

export function setUnreadNotificationCount(queryClient: QueryClient, unreadCount: number): void {
  queryClient.setQueryData(queryKeys.notifications.unreadCount, unreadCount);
}

export function appendNotification(
  queryClient: QueryClient,
  payload: NotificationPayload,
): void {
  const notification = toNotification(payload);

  queryClient.setQueryData<NotificationListResponse>(queryKeys.notifications.list, (current) => {
    if (!current) {
      return { data: [notification] };
    }

    const existingIndex = current.data.findIndex((item) => item.id === notification.id);
    if (existingIndex >= 0) {
      const next = [...current.data];
      next[existingIndex] = notification;
      return { data: next };
    }

    return { data: [notification, ...current.data] };
  });

  if (!notification.isRead) {
    const currentCount = queryClient.getQueryData<number>(queryKeys.notifications.unreadCount) ?? 0;
    setUnreadNotificationCount(queryClient, currentCount + 1);
  }
}
