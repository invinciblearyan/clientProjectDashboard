import { TaskPriority, TaskStatus } from '@prisma/client';
import { prisma } from '../utils/prisma';

const TASK_STATUSES: TaskStatus[] = ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE'];
const TASK_PRIORITIES: TaskPriority[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

function toStatusCountMap(
  groups: Array<{ status: TaskStatus; _count: { _all: number } }>,
): Record<TaskStatus, number> {
  const counts = Object.fromEntries(TASK_STATUSES.map((status) => [status, 0])) as Record<
    TaskStatus,
    number
  >;

  for (const group of groups) {
    counts[group.status] = group._count._all;
  }

  return counts;
}

function toPriorityCountMap(
  groups: Array<{ priority: TaskPriority; _count: { _all: number } }>,
): Record<TaskPriority, number> {
  const counts = Object.fromEntries(
    TASK_PRIORITIES.map((priority) => [priority, 0]),
  ) as Record<TaskPriority, number>;

  for (const group of groups) {
    counts[group.priority] = group._count._all;
  }

  return counts;
}

export const dashboardRepository = {
  countAllProjects(): Promise<number> {
    return prisma.project.count();
  },

  async getAdminTasksByStatus(): Promise<Record<TaskStatus, number>> {
    const groups = await prisma.task.groupBy({
      by: ['status'],
      _count: { _all: true },
    });

    return toStatusCountMap(groups);
  },

  countOverdueTasks(): Promise<number> {
    return prisma.task.count({ where: { isOverdue: true } });
  },

  countPmProjects(createdById: string): Promise<number> {
    return prisma.project.count({ where: { createdById } });
  },

  async getPmTasksByPriority(createdById: string): Promise<Record<TaskPriority, number>> {
    const groups = await prisma.task.groupBy({
      by: ['priority'],
      where: { project: { createdById } },
      _count: { _all: true },
    });

    return toPriorityCountMap(groups);
  },

  findPmUpcomingDueThisWeek(createdById: string, weekStart: Date, weekEnd: Date) {
    return prisma.task.findMany({
      where: {
        project: { createdById },
        dueDate: { gte: weekStart, lte: weekEnd },
        status: { not: 'DONE' },
      },
      orderBy: [{ dueDate: 'asc' }, { priority: 'desc' }],
      select: {
        id: true,
        title: true,
        priority: true,
        status: true,
        dueDate: true,
        project: { select: { id: true, name: true } },
      },
    });
  },

  findDeveloperAssignedTasks(assigneeId: string) {
    return prisma.task.findMany({
      where: { assigneeId },
      orderBy: [{ priority: 'desc' }, { dueDate: 'asc' }],
      select: {
        id: true,
        title: true,
        status: true,
        priority: true,
        dueDate: true,
        isOverdue: true,
        project: { select: { id: true, name: true } },
      },
    });
  },
};
