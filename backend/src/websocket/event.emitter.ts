import type { Server } from 'socket.io';
import type { Task, TaskStatus } from '@prisma/client';
import { userRepository } from '../repositories/user.repository';
import { mapActivityToEvent } from '../utils/activity-mapper';
import type { ActivityEventPayload, NotificationPayload, TaskStatusChangedPayload } from './types';
import { ADMIN_PRESENCE_ROOM, SOCKET_EVENTS, projectRoom, userRoom } from './types';

type ActivityWithRelations = Parameters<typeof mapActivityToEvent>[0];

let websocketEmitter: WebSocketEventEmitter | null = null;

export class WebSocketEventEmitter {
  constructor(private readonly io: Server) {}

  async emitActivity(activity: ActivityWithRelations): Promise<void> {
    const event = mapActivityToEvent(activity);
    const recipients = await this.getActivityRecipientIds(activity);

    for (const userId of recipients) {
      this.io.to(userRoom(userId)).emit(SOCKET_EVENTS.ACTIVITY_EVENT, { event });
    }
  }

  private async getActivityRecipientIds(activity: ActivityWithRelations): Promise<Set<string>> {
    const recipients = new Set<string>();
    const admins = await userRepository.findActiveAdmins();
    admins.forEach((admin) => recipients.add(admin.id));

    const projectCreatedById = activity.project?.createdById;
    if (projectCreatedById) {
      recipients.add(projectCreatedById);
    }

    const taskAssigneeId = activity.task?.assigneeId;
    if (taskAssigneeId) {
      recipients.add(taskAssigneeId);
    }

    return recipients;
  }

  emitTaskStatusChanged(
    task: Pick<Task, 'id' | 'title' | 'status' | 'assigneeId' | 'projectId'>,
    previousStatus: TaskStatus,
    newStatus: TaskStatus,
  ): void {
    const payload: TaskStatusChangedPayload = {
      taskId: task.id,
      projectId: task.projectId,
      previousStatus,
      newStatus,
      task: {
        id: task.id,
        title: task.title,
        status: task.status,
        assigneeId: task.assigneeId,
        projectId: task.projectId,
      },
    };

    this.io.to(projectRoom(task.projectId)).emit(SOCKET_EVENTS.TASK_STATUS_CHANGED, payload);

    if (task.assigneeId) {
      this.io.to(userRoom(task.assigneeId)).emit(SOCKET_EVENTS.TASK_STATUS_CHANGED, payload);
    }
  }

  emitPresenceGlobal(onlineCount: number): void {
    this.io.to(ADMIN_PRESENCE_ROOM).emit(SOCKET_EVENTS.PRESENCE_GLOBAL, { onlineCount });
  }

  emitNotificationNew(userId: string, notification: NotificationPayload): void {
    this.io.to(userRoom(userId)).emit(SOCKET_EVENTS.NOTIFICATION_NEW, { notification });
  }

  emitNotificationCount(userId: string, unreadCount: number): void {
    this.io.to(userRoom(userId)).emit(SOCKET_EVENTS.NOTIFICATION_COUNT, { unreadCount });
  }
}

export function setWebSocketEmitter(emitter: WebSocketEventEmitter): void {
  websocketEmitter = emitter;
}

export function getWebSocketEmitter(): WebSocketEventEmitter | null {
  return websocketEmitter;
}

export type { ActivityEventPayload };
