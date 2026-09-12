import type { Prisma, TaskStatus } from '@prisma/client';
import { ActivityType } from '@prisma/client';
import { activityLogRepository } from '../repositories/activity-log.repository';
import { projectRepository } from '../repositories/project.repository';
import { taskRepository } from '../repositories/task.repository';
import { mapActivityToEvent } from '../utils/activity-mapper';
import { notFound } from '../utils/api-error';
import { buildPaginationMeta, getPagination } from '../utils/pagination';
import type { AuthUser } from '../types/auth';

export const activityService = {
  async list(
    actor: AuthUser,
    filters: { projectId?: string; page: number; limit: number },
  ) {
    const pagination = getPagination(filters);

    if (filters.projectId) {
      await this.assertProjectActivityAccess(actor, filters.projectId);
    }

    if (actor.role === 'ADMIN') {
      const [activities, total] = await Promise.all([
        activityLogRepository.findManyForAdmin({
          projectId: filters.projectId,
          skip: pagination.skip,
          take: pagination.take,
        }),
        activityLogRepository.countForAdmin(filters.projectId),
      ]);

      return {
        data: activities.map(mapActivityToEvent),
        pagination: buildPaginationMeta(filters, total),
      };
    }

    if (actor.role === 'PROJECT_MANAGER') {
      const [activities, total] = await Promise.all([
        activityLogRepository.findManyForPm(actor.id, {
          projectId: filters.projectId,
          skip: pagination.skip,
          take: pagination.take,
        }),
        activityLogRepository.countForPm(actor.id, filters.projectId),
      ]);

      return {
        data: activities.map(mapActivityToEvent),
        pagination: buildPaginationMeta(filters, total),
      };
    }

    const [activities, total] = await Promise.all([
      activityLogRepository.findManyForDeveloper(actor.id, {
        projectId: filters.projectId,
        skip: pagination.skip,
        take: pagination.take,
      }),
      activityLogRepository.countForDeveloper(actor.id, filters.projectId),
    ]);

    return {
      data: activities.map(mapActivityToEvent),
      pagination: buildPaginationMeta(filters, total),
    };
  },

  async assertProjectActivityAccess(actor: AuthUser, projectId: string): Promise<void> {
    if (actor.role === 'ADMIN') {
      const project = await projectRepository.findById(projectId);
      if (!project) {
        throw notFound('Project not found');
      }
      return;
    }

    if (actor.role === 'PROJECT_MANAGER') {
      const project = await projectRepository.findByIdForPm(projectId, actor.id);
      if (!project) {
        throw notFound('Project not found');
      }
      return;
    }

    const assignedTask = await taskRepository.findFirstAssignedInProject(actor.id, projectId);
    if (!assignedTask) {
      throw notFound('Project not found');
    }
  },
  async logTaskStatusChange(
    params: {
      taskId: string;
      projectId: string;
      actorId: string;
      previousStatus: TaskStatus;
      newStatus: TaskStatus;
      taskTitle: string;
    },
    tx?: Prisma.TransactionClient,
  ) {
    return activityLogRepository.create({
      type: ActivityType.TASK_STATUS_CHANGED,
      summary: `Task "${params.taskTitle}" status changed from ${params.previousStatus} to ${params.newStatus}`,
      actorId: params.actorId,
      projectId: params.projectId,
      taskId: params.taskId,
      previousStatus: params.previousStatus,
      newStatus: params.newStatus,
    }, tx);
  },

  async logTaskCreated(params: {
    taskId: string;
    projectId: string;
    actorId: string;
    taskTitle: string;
  }, tx?: Prisma.TransactionClient) {
    return activityLogRepository.create({
      type: ActivityType.TASK_CREATED,
      summary: `Task "${params.taskTitle}" created`,
      actorId: params.actorId,
      projectId: params.projectId,
      taskId: params.taskId,
    }, tx);
  },

  async logTaskAssigned(params: {
    taskId: string;
    projectId: string;
    actorId: string;
    taskTitle: string;
    assigneeName: string;
  }, tx?: Prisma.TransactionClient) {
    return activityLogRepository.create({
      type: ActivityType.TASK_ASSIGNED,
      summary: `Task "${params.taskTitle}" assigned to ${params.assigneeName}`,
      actorId: params.actorId,
      projectId: params.projectId,
      taskId: params.taskId,
    }, tx);
  },
};
