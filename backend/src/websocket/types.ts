import type { UserRole } from '@prisma/client';

export interface SocketUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

export interface ActivityEventPayload {
  id: string;
  type: string;
  summary: string;
  source: string;
  actorId: string | null;
  actor: { id: string; name: string } | null;
  projectId: string | null;
  taskId: string | null;
  previousStatus: string | null;
  newStatus: string | null;
  createdAt: string;
  project: { id: string; name: string; createdById: string } | null;
  task: { id: string; title: string; assigneeId: string | null } | null;
}

export interface ActivityCatchupPayload {
  events: ActivityEventPayload[];
  count: number;
  serverTimestamp: string;
}

export interface TaskStatusChangedPayload {
  taskId: string;
  projectId: string;
  previousStatus: string;
  newStatus: string;
  task: {
    id: string;
    title: string;
    status: string;
    assigneeId: string | null;
    projectId: string;
  };
}

export interface PresenceGlobalPayload {
  onlineCount: number;
}

export interface PresenceProjectPayload {
  projectId: string;
  users: Array<{ id: string; name: string }>;
}

export interface NotificationPayload {
  id: string; type: string; title: string; message: string; projectId: string | null;
  taskId: string | null; isRead: boolean; readAt: Date | null; createdAt: Date;
}

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

export function userRoom(userId: string): string {
  return `user:${userId}`;
}

export function projectRoom(projectId: string): string {
  return `project:${projectId}`;
}

export const ADMIN_PRESENCE_ROOM = 'admin:presence';
