import type { NotificationType, Prisma } from '@prisma/client';
import { notFound } from '../utils/api-error';
import { notificationRepository } from '../repositories/notification.repository';
import { getWebSocketEmitter } from '../websocket/event.emitter';

export const notificationService = {
  create(input: { userId: string; type: NotificationType; title: string; message: string; projectId?: string; taskId?: string }, tx?: Prisma.TransactionClient) { return notificationRepository.create(input, tx); },
  list(userId: string) { return notificationRepository.listForUser(userId); },
  unreadCount(userId: string) { return notificationRepository.unreadCount(userId); },
  async markRead(userId: string, id: string) {
    const result = await notificationRepository.markRead(id, userId);
    if (result.count === 0) throw notFound('Notification not found');
    await this.emitUnreadCount(userId);
  },
  async markAllRead(userId: string) { await notificationRepository.markAllRead(userId); await this.emitUnreadCount(userId); },
  async emitCreated(userId: string, notification: Awaited<ReturnType<typeof notificationRepository.create>>) {
    const emitter = getWebSocketEmitter();
    if (!emitter) return;
    emitter.emitNotificationNew(userId, notification);
    await this.emitUnreadCount(userId);
  },
  async emitUnreadCount(userId: string) {
    const emitter = getWebSocketEmitter();
    if (emitter) emitter.emitNotificationCount(userId, await notificationRepository.unreadCount(userId));
  },
};
