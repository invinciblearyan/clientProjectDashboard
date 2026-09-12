import type { Prisma, Task, TaskPriority, TaskStatus } from '@prisma/client';
import { prisma } from '../utils/prisma';

export interface TaskListFilters {
  status?: TaskStatus;
  priority?: TaskPriority;
  dueDateFrom?: Date;
  dueDateTo?: Date;
  projectId?: string;
  assigneeId?: string;
  isOverdue?: boolean;
  projectCreatedById?: string;
  skip: number;
  take: number;
}

const developerOrderBy = [
  { priority: 'desc' as const },
  { dueDate: 'asc' as const },
];

function buildWhere(filters: Omit<TaskListFilters, 'skip' | 'take'>): Prisma.TaskWhereInput {
  return {
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.priority ? { priority: filters.priority } : {}),
    ...(filters.projectId ? { projectId: filters.projectId } : {}),
    ...(filters.assigneeId ? { assigneeId: filters.assigneeId } : {}),
    ...(filters.isOverdue !== undefined ? { isOverdue: filters.isOverdue } : {}),
    ...(filters.projectCreatedById
      ? { project: { createdById: filters.projectCreatedById } }
      : {}),
    ...(filters.dueDateFrom || filters.dueDateTo
      ? {
          dueDate: {
            ...(filters.dueDateFrom ? { gte: filters.dueDateFrom } : {}),
            ...(filters.dueDateTo ? { lte: filters.dueDateTo } : {}),
          },
        }
      : {}),
  };
}

export const taskRepository = {
  findTasksToMarkOverdue(now: Date) {
    return prisma.task.findMany({ where: { dueDate: { lt: now }, status: { not: 'DONE' }, isOverdue: false }, select: { id: true, title: true, dueDate: true, projectId: true } });
  },

  markOverdueIfEligible(id: string, now: Date, tx: Prisma.TransactionClient) {
    return tx.task.updateMany({ where: { id, dueDate: { lt: now }, status: { not: 'DONE' }, isOverdue: false }, data: { isOverdue: true, overdueAt: now } });
  },

  findMany(filters: TaskListFilters, forDeveloper = false): Promise<Task[]> {
    return prisma.task.findMany({
      where: buildWhere(filters),
      skip: filters.skip,
      take: filters.take,
      orderBy: forDeveloper ? developerOrderBy : { createdAt: 'desc' },
      include: {
        project: { select: { id: true, name: true, createdById: true } },
        assignee: { select: { id: true, name: true, email: true } },
      },
    });
  },

  count(filters: Omit<TaskListFilters, 'skip' | 'take'>): Promise<number> {
    return prisma.task.count({ where: buildWhere(filters) });
  },

  findById(id: string): Promise<Task | null> {
    return prisma.task.findUnique({
      where: { id },
      include: {
        project: { select: { id: true, name: true, createdById: true } },
        assignee: { select: { id: true, name: true, email: true } },
      },
    });
  },

  findByIdForDeveloper(id: string, assigneeId: string): Promise<Task | null> {
    return prisma.task.findFirst({
      where: { id, assigneeId },
      include: {
        project: { select: { id: true, name: true } },
        assignee: { select: { id: true, name: true, email: true } },
      },
    });
  },

  findByIdForPm(id: string, projectCreatedById: string): Promise<Task | null> {
    return prisma.task.findFirst({
      where: { id, project: { createdById: projectCreatedById } },
      include: {
        project: { select: { id: true, name: true, createdById: true } },
        assignee: { select: { id: true, name: true, email: true } },
      },
    });
  },

  findFirstAssignedInProject(assigneeId: string, projectId: string): Promise<Task | null> {
    return prisma.task.findFirst({
      where: { assigneeId, projectId },
    });
  },

  create(data: Prisma.TaskCreateInput): Promise<Task> {
    return prisma.task.create({
      data,
      include: {
        project: { select: { id: true, name: true, createdById: true } },
        assignee: { select: { id: true, name: true, email: true } },
      },
    });
  },

  update(id: string, data: Prisma.TaskUpdateInput): Promise<Task> {
    return prisma.task.update({
      where: { id },
      data,
      include: {
        project: { select: { id: true, name: true, createdById: true } },
        assignee: { select: { id: true, name: true, email: true } },
      },
    });
  },

  delete(id: string): Promise<Task> {
    return prisma.task.delete({ where: { id } });
  },
};
