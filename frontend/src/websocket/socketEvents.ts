import type { TaskStatus } from '../types/api';

export const SOCKET_EVENTS = {
  ACTIVITY_EVENT: 'activity:event',
  ACTIVITY_CATCHUP: 'activity:catchup',
  ACTIVITY_REQUEST_CATCHUP: 'activity:request-catchup',
  TASK_STATUS_CHANGED: 'task:status-changed',
  NOTIFICATION_NEW: 'notification:new',
  NOTIFICATION_COUNT: 'notification:count',
  PRESENCE_JOIN_PROJECT: 'presence:join-project',
  PRESENCE_LEAVE_PROJECT: 'presence:leave-project',
  PRESENCE_GLOBAL: 'presence:global',
  PRESENCE_PROJECT: 'presence:project',
} as const;

export type TaskStatusChangedPayload = {
  taskId: string;
  projectId: string;
  previousStatus: TaskStatus;
  newStatus: TaskStatus;
  task: {
    id: string;
    title: string;
    status: TaskStatus;
    assigneeId: string | null;
    projectId: string;
  };
};

export type ActivityEventPayload = {
  id: string;
  type: string;
  summary: string;
  source: string;
  actorId: string | null;
  actor: { id: string; name: string } | null;
  projectId: string | null;
  taskId: string | null;
  previousStatus: TaskStatus | null;
  newStatus: TaskStatus | null;
  createdAt: string;
  project: { id: string; name: string; createdById: string } | null;
  task: { id: string; title: string; assigneeId: string | null } | null;
};

export type ActivityEventMessage = {
  event: ActivityEventPayload;
};

export type ActivityCatchupPayload = {
  events: ActivityEventPayload[];
  count: number;
  serverTimestamp: string;
};

export type NotificationPayload = {
  id: string;
  type: string;
  title: string;
  message: string;
  projectId: string | null;
  taskId: string | null;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
};

export type NotificationNewMessage = {
  notification: NotificationPayload;
};

export type NotificationCountMessage = {
  unreadCount: number;
};

export type PresenceGlobalPayload = {
  onlineCount: number;
};

export type PresenceProjectPayload = {
  projectId: string;
  users: Array<{ id: string; name: string }>;
};
