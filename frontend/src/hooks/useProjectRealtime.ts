import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useSocket } from '../contexts/SocketContext';
import { appendActivityEvents } from '../websocket/activitySync';
import {
  SOCKET_EVENTS,
  type ActivityEventMessage,
  type TaskStatusChangedPayload,
} from '../websocket/socketEvents';
import { invalidateTaskStatusQueries } from '../websocket/taskStatusSync';

export function useProjectRealtime(projectId: string | undefined, enabled: boolean): void {
  const { socket } = useSocket();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!socket || !projectId || !enabled) {
      return;
    }

    socket.emit(SOCKET_EVENTS.PRESENCE_JOIN_PROJECT, { projectId });

    const handleTaskStatusChanged = (payload: TaskStatusChangedPayload) => {
      if (payload.projectId !== projectId) {
        return;
      }

      invalidateTaskStatusQueries(queryClient, payload);
    };

    const handleActivityEvent = (message: ActivityEventMessage) => {
      if (message.event.projectId !== projectId) {
        return;
      }

      appendActivityEvents(queryClient, [message.event]);
    };

    socket.on(SOCKET_EVENTS.TASK_STATUS_CHANGED, handleTaskStatusChanged);
    socket.on(SOCKET_EVENTS.ACTIVITY_EVENT, handleActivityEvent);

    return () => {
      socket.emit(SOCKET_EVENTS.PRESENCE_LEAVE_PROJECT, { projectId });
      socket.off(SOCKET_EVENTS.TASK_STATUS_CHANGED, handleTaskStatusChanged);
      socket.off(SOCKET_EVENTS.ACTIVITY_EVENT, handleActivityEvent);
    };
  }, [socket, projectId, enabled, queryClient]);
}
