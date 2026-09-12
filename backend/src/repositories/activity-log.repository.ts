import type { ActivityType, Prisma, TaskStatus } from '@prisma/client';
import { prisma } from '../utils/prisma';

const activityRelationsInclude = {
  actor: { select: { id: true, name: true, email: true } },
  project: { select: { id: true, name: true, createdById: true } },
  task: { select: { id: true, title: true, assigneeId: true } },
};

export const activityLogRepository = {
  findByIdWithRelations(id: string) {
    return prisma.activityLog.findUnique({
      where: { id },
      include: activityRelationsInclude,
    });
  },

  findLatestForAdmin(limit = 20) {
    return prisma.activityLog.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: activityRelationsInclude,
    });
  },

  findLatestForPm(pmId: string, limit = 20) {
    return prisma.activityLog.findMany({
      where: { project: { createdById: pmId } },
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: activityRelationsInclude,
    });
  },

  findLatestForDeveloper(developerId: string, limit = 20) {
    return prisma.activityLog.findMany({
      where: { task: { assigneeId: developerId } },
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: activityRelationsInclude,
    });
  },

  buildAdminWhere(projectId?: string): Prisma.ActivityLogWhereInput {
    return projectId ? { projectId } : {};
  },

  buildPmWhere(pmId: string, projectId?: string): Prisma.ActivityLogWhereInput {
    return {
      project: {
        createdById: pmId,
        ...(projectId ? { id: projectId } : {}),
      },
    };
  },

  buildDeveloperWhere(developerId: string, projectId?: string): Prisma.ActivityLogWhereInput {
    return {
      task: {
        assigneeId: developerId,
        ...(projectId ? { projectId } : {}),
      },
    };
  },

  findManyForAdmin(filters: { projectId?: string; skip: number; take: number }) {
    return prisma.activityLog.findMany({
      where: this.buildAdminWhere(filters.projectId),
      skip: filters.skip,
      take: filters.take,
      orderBy: { createdAt: 'desc' },
      include: activityRelationsInclude,
    });
  },

  countForAdmin(projectId?: string) {
    return prisma.activityLog.count({ where: this.buildAdminWhere(projectId) });
  },

  findManyForPm(pmId: string, filters: { projectId?: string; skip: number; take: number }) {
    return prisma.activityLog.findMany({
      where: this.buildPmWhere(pmId, filters.projectId),
      skip: filters.skip,
      take: filters.take,
      orderBy: { createdAt: 'desc' },
      include: activityRelationsInclude,
    });
  },

  countForPm(pmId: string, projectId?: string) {
    return prisma.activityLog.count({ where: this.buildPmWhere(pmId, projectId) });
  },

  findManyForDeveloper(
    developerId: string,
    filters: { projectId?: string; skip: number; take: number },
  ) {
    return prisma.activityLog.findMany({
      where: this.buildDeveloperWhere(developerId, filters.projectId),
      skip: filters.skip,
      take: filters.take,
      orderBy: { createdAt: 'desc' },
      include: activityRelationsInclude,
    });
  },

  countForDeveloper(developerId: string, projectId?: string) {
    return prisma.activityLog.count({
      where: this.buildDeveloperWhere(developerId, projectId),
    });
  },

  create(data: {
    type: ActivityType;
    summary: string;
    actorId?: string | null;
    projectId?: string | null;
    taskId?: string | null;
    clientId?: string | null;
    previousStatus?: TaskStatus | null;
    newStatus?: TaskStatus | null;
    metadata?: Prisma.InputJsonValue;
    source?: 'USER' | 'SYSTEM';
  }, tx?: Prisma.TransactionClient) {
    const client = tx ?? prisma;
    const createData: Prisma.ActivityLogUncheckedCreateInput = {
      type: data.type,
      summary: data.summary,
      ...(data.source !== undefined ? { source: data.source } : {}),
      ...(data.actorId !== undefined ? { actorId: data.actorId } : {}),
      ...(data.projectId !== undefined ? { projectId: data.projectId } : {}),
      ...(data.taskId !== undefined ? { taskId: data.taskId } : {}),
      ...(data.clientId !== undefined ? { clientId: data.clientId } : {}),
      ...(data.previousStatus !== undefined ? { previousStatus: data.previousStatus } : {}),
      ...(data.newStatus !== undefined ? { newStatus: data.newStatus } : {}),
      ...(data.metadata !== undefined ? { metadata: data.metadata } : {}),
    };

    return client.activityLog.create({ data: createData });
  },
};
