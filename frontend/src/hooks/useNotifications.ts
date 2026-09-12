import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { notificationsApi } from '../api/notifications.api';
import { queryKeys } from '../api/queryKeys';
import type { NotificationListResponse } from '../types/api';

export function useNotifications() {
  return useQuery({
    queryKey: queryKeys.notifications.list,
    queryFn: () => notificationsApi.list(),
  });
}

export function useUnreadNotificationCount() {
  return useQuery({
    queryKey: queryKeys.notifications.unreadCount,
    queryFn: async () => {
      const response = await notificationsApi.unreadCount();
      return response.data.unreadCount;
    },
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => notificationsApi.markRead(id),
    onSuccess: (_result, id) => {
      queryClient.setQueryData<NotificationListResponse>(queryKeys.notifications.list, (current) => {
        if (!current) {
          return current;
        }

        return {
          data: current.data.map((notification) =>
            notification.id === id
              ? { ...notification, isRead: true, readAt: new Date().toISOString() }
              : notification,
          ),
        };
      });

      const currentCount =
        queryClient.getQueryData<number>(queryKeys.notifications.unreadCount) ?? 0;
      queryClient.setQueryData(
        queryKeys.notifications.unreadCount,
        Math.max(0, currentCount - 1),
      );
    },
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onSuccess: () => {
      queryClient.setQueryData<NotificationListResponse>(queryKeys.notifications.list, (current) => {
        if (!current) {
          return current;
        }

        return {
          data: current.data.map((notification) => ({
            ...notification,
            isRead: true,
            readAt: notification.readAt ?? new Date().toISOString(),
          })),
        };
      });
      queryClient.setQueryData(queryKeys.notifications.unreadCount, 0);
    },
  });
}
