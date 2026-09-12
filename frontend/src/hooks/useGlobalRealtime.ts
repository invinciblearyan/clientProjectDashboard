import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { queryKeys } from '../api/queryKeys';
import { useSocket } from '../contexts/SocketContext';
import { useAuth } from './useAuth';
import { appendActivityEvents } from '../websocket/activitySync';
import {
  appendNotification,
  setUnreadNotificationCount,
} from '../websocket/notificationSync';
import {
  SOCKET_EVENTS,
  type ActivityCatchupPayload,
  type ActivityEventMessage,
  type NotificationCountMessage,
  type NotificationNewMessage,
  type PresenceGlobalPayload,
  type TaskStatusChangedPayload,
} from '../websocket/socketEvents';
import { invalidateTaskStatusQueries } from '../websocket/taskStatusSync';
import type { AdminDashboard } from '../types/api';

export function useGlobalRealtime(): void {
  const { socket } = useSocket();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!socket || !user) {
      return;
    }

    const requestCatchup = () => {
      socket.emit(SOCKET_EVENTS.ACTIVITY_REQUEST_CATCHUP);
    };

    const handleActivityEvent = (message: ActivityEventMessage) => {
      appendActivityEvents(queryClient, [message.event]);
    };

    const handleActivityCatchup = (payload: ActivityCatchupPayload) => {
      appendActivityEvents(queryClient, payload.events);
    };

    const handleNotificationNew = (message: NotificationNewMessage) => {
      appendNotification(queryClient, message.notification);
    };

    const handleNotificationCount = (message: NotificationCountMessage) => {
      setUnreadNotificationCount(queryClient, message.unreadCount);
    };

    const handlePresenceGlobal = (payload: PresenceGlobalPayload) => {
      if (user.role !== 'ADMIN') {
        return;
      }

      queryClient.setQueryData<AdminDashboard>(queryKeys.dashboard.admin, (current) => {
        if (!current) {
          return current;
        }

        return {
          ...current,
          activeUsersOnline: payload.onlineCount,
        };
      });
    };

    const handleTaskStatusChanged = (payload: TaskStatusChangedPayload) => {
      if (user.role === 'DEVELOPER') {
        invalidateTaskStatusQueries(queryClient, payload);
      }
    };

    socket.on(SOCKET_EVENTS.ACTIVITY_EVENT, handleActivityEvent);
    socket.on(SOCKET_EVENTS.ACTIVITY_CATCHUP, handleActivityCatchup);
    socket.on(SOCKET_EVENTS.NOTIFICATION_NEW, handleNotificationNew);
    socket.on(SOCKET_EVENTS.NOTIFICATION_COUNT, handleNotificationCount);
    socket.on(SOCKET_EVENTS.PRESENCE_GLOBAL, handlePresenceGlobal);
    socket.on(SOCKET_EVENTS.TASK_STATUS_CHANGED, handleTaskStatusChanged);

    requestCatchup();
    socket.on('connect', requestCatchup);

    return () => {
      socket.off('connect', requestCatchup);
      socket.off(SOCKET_EVENTS.ACTIVITY_EVENT, handleActivityEvent);
      socket.off(SOCKET_EVENTS.ACTIVITY_CATCHUP, handleActivityCatchup);
      socket.off(SOCKET_EVENTS.NOTIFICATION_NEW, handleNotificationNew);
      socket.off(SOCKET_EVENTS.NOTIFICATION_COUNT, handleNotificationCount);
      socket.off(SOCKET_EVENTS.PRESENCE_GLOBAL, handlePresenceGlobal);
      socket.off(SOCKET_EVENTS.TASK_STATUS_CHANGED, handleTaskStatusChanged);
    };
  }, [socket, user, queryClient]);
}
