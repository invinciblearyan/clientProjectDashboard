import type { NotificationType, Prisma } from '@prisma/client';
import { prisma } from '../utils/prisma';

const notificationSelect = {
  id: true, type: true, title: true, message: true, projectId: true, taskId: true,
  isRead: true, readAt: true, createdAt: true,
} satisfies Prisma.NotificationSelect;

export const notificationRepository = {
  listForUser(userId: string) { return prisma.notification.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, select: notificationSelect }); },
  unreadCount(userId: string) { return prisma.notification.count({ where: { userId, isRead: false } }); },
  create(data: { userId: string; type: NotificationType; title: string; message: string; projectId?: string; taskId?: string }, tx?: Prisma.TransactionClient) {
    return (tx ?? prisma).notification.create({ data, select: notificationSelect });
  },
  markRead(id: string, userId: string) { return prisma.notification.updateMany({ where: { id, userId }, data: { isRead: true, readAt: new Date() } }); },
  markAllRead(userId: string) { return prisma.notification.updateMany({ where: { userId, isRead: false }, data: { isRead: true, readAt: new Date() } }); },
};
