import { QueryClient } from '@tanstack/react-query';
import { describe, expect, it } from 'vitest';
import { queryKeys } from '../api/queryKeys';
import type { NotificationListResponse } from '../types/api';
import {
  appendNotification,
  setUnreadNotificationCount,
} from './notificationSync';

describe('notificationSync', () => {
  it('updates unread count from socket payload', () => {
    const queryClient = new QueryClient();
    setUnreadNotificationCount(queryClient, 4);

    expect(queryClient.getQueryData(queryKeys.notifications.unreadCount)).toBe(4);
  });

  it('prepends notification:new events and increments unread count', () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(queryKeys.notifications.list, { data: [] });
    queryClient.setQueryData(queryKeys.notifications.unreadCount, 1);

    appendNotification(queryClient, {
      id: 'notification-1',
      type: 'TASK_STATUS_CHANGED',
      title: 'Task updated',
      message: 'A task status changed',
      projectId: 'project-1',
      taskId: 'task-1',
      isRead: false,
      readAt: null,
      createdAt: '2026-09-01T00:00:00.000Z',
    });

    const list = queryClient.getQueryData<NotificationListResponse>(queryKeys.notifications.list);
    expect(list?.data).toHaveLength(1);
    expect(queryClient.getQueryData(queryKeys.notifications.unreadCount)).toBe(2);
  });
});
