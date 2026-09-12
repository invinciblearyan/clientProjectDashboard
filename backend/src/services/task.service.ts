import { NotificationType, type Prisma, type TaskPriority, type TaskStatus } from '@prisma/client';
import { taskRepository } from '../repositories/task.repository';
import { projectRepository } from '../repositories/project.repository';
import { userRepository } from '../repositories/user.repository';
import { activityLogRepository } from '../repositories/activity-log.repository';
import { authorizationService } from './authorization.service';
import { activityService } from './activity.service';
import { buildPaginationMeta, getPagination } from '../utils/pagination';
import { forbidden, notFound } from '../utils/api-error';
import { prisma } from '../utils/prisma';
import { getWebSocketEmitter } from '../websocket/event.emitter';
import { notificationService } from './notification.service';
import type { AuthUser } from '../types/auth';

function mapTaskForDeveloper(task: Awaited<ReturnType<typeof taskRepository.findById>>) {
  if (!task) {
    return null;
  }

  const project = (task as { project?: { id: string; name: string } }).project;

  return {
    id: task.id,
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority,
    dueDate: task.dueDate,
    isOverdue: task.isOverdue,
    overdueAt: task.overdueAt,
    assigneeId: task.assigneeId,
    projectId: task.projectId,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
    project: project ? { id: project.id, name: project.name } : undefined,
  };
}

function getOverdueClearFields(
  status: TaskStatus,
  dueDate: Date | null | undefined,
): { isOverdue: false; overdueAt: null } | Record<string, never> {
  const isDone = status === 'DONE';
  const dueDateInFuture = dueDate ? dueDate > new Date() : false;

  if (isDone || dueDateInFuture) {
    return { isOverdue: false, overdueAt: null };
  }

  return {};
}

export const taskService = {
  async list(
    actor: AuthUser,
    filters: {
      status?: TaskStatus;
      priority?: TaskPriority;
      dueDateFrom?: Date;
      dueDateTo?: Date;
      projectId?: string;
      assigneeId?: string;
      isOverdue?: boolean;
      page: number;
      limit: number;
    },
  ) {
    authorizationService.assertAdminOrPmOrDeveloper(actor);

    const pagination = getPagination(filters);
    const listFilters = {
      status: filters.status,
      priority: filters.priority,
      dueDateFrom: filters.dueDateFrom,
      dueDateTo: filters.dueDateTo,
      projectId: filters.projectId,
      assigneeId:
        actor.role === 'DEVELOPER'
          ? actor.id
          : filters.assigneeId,
      isOverdue: filters.isOverdue,
      projectCreatedById: actor.role === 'PROJECT_MANAGER' ? actor.id : undefined,
      skip: pagination.skip,
      take: pagination.take,
    };

    const [tasks, total] = await Promise.all([
      taskRepository.findMany(listFilters, actor.role === 'DEVELOPER'),
      taskRepository.count({
        status: filters.status,
        priority: filters.priority,
        dueDateFrom: filters.dueDateFrom,
        dueDateTo: filters.dueDateTo,
        projectId: filters.projectId,
        assigneeId:
          actor.role === 'DEVELOPER'
            ? actor.id
            : filters.assigneeId,
        isOverdue: filters.isOverdue,
        projectCreatedById: actor.role === 'PROJECT_MANAGER' ? actor.id : undefined,
      }),
    ]);

    const data =
      actor.role === 'DEVELOPER'
        ? tasks.map((task) => mapTaskForDeveloper(task)!)
        : tasks;

    return {
      data,
      pagination: buildPaginationMeta(filters, total),
    };
  },

  async getById(actor: AuthUser, id: string) {
    authorizationService.assertAdminOrPmOrDeveloper(actor);

    let task;

    if (actor.role === 'DEVELOPER') {
      task = await taskRepository.findByIdForDeveloper(id, actor.id);
    } else if (actor.role === 'PROJECT_MANAGER') {
      task = await taskRepository.findByIdForPm(id, actor.id);
    } else {
      task = await taskRepository.findById(id);
    }

    if (!task) {
      throw notFound('Task not found');
    }

    return actor.role === 'DEVELOPER' ? mapTaskForDeveloper(task) : task;
  },

  async create(
    actor: AuthUser,
    input: {
      title: string;
      description?: string;
      status?: TaskStatus;
      priority?: TaskPriority;
      projectId: string;
      assigneeId?: string;
      dueDate?: Date;
    },
  ) {
    authorizationService.assertAdminOrPm(actor);

    const project =
      actor.role === 'ADMIN'
        ? await projectRepository.findById(input.projectId)
        : await projectRepository.findByIdForPm(input.projectId, actor.id);

    if (!project) {
      throw notFound('Project not found');
    }

    if (input.assigneeId) {
      const developer = await userRepository.findDeveloperById(input.assigneeId);
      if (!developer) {
        throw notFound('Developer not found');
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      const task = await tx.task.create({
        data: {
          title: input.title, description: input.description, status: input.status,
          priority: input.priority, dueDate: input.dueDate,
          project: { connect: { id: input.projectId } }, createdBy: { connect: { id: actor.id } },
          ...(input.assigneeId ? { assignee: { connect: { id: input.assigneeId } } } : {}),
        },
        include: { project: { select: { id: true, name: true, createdById: true } }, assignee: { select: { id: true, name: true, email: true } } },
      });
      await activityService.logTaskCreated({ taskId: task.id, projectId: task.projectId, actorId: actor.id, taskTitle: task.title }, tx);
      let notification = null;
      if (input.assigneeId) {
        const assignee = await userRepository.findById(input.assigneeId);
        await activityService.logTaskAssigned({ taskId: task.id, projectId: task.projectId, actorId: actor.id, taskTitle: task.title, assigneeName: assignee?.name ?? 'Developer' }, tx);
        notification = await notificationService.create({
          userId: input.assigneeId, type: NotificationType.TASK_ASSIGNED,
          title: 'Task assigned', message: `You were assigned to task "${task.title}"`, projectId: task.projectId, taskId: task.id,
        }, tx);
      }
      return { task, notification };
    });
    if (result.notification && input.assigneeId) await notificationService.emitCreated(input.assigneeId, result.notification);
    return result.task;
  },

  async update(
    actor: AuthUser,
    id: string,
    input: {
      title?: string;
      description?: string | null;
      status?: TaskStatus;
      priority?: TaskPriority;
      assigneeId?: string | null;
      dueDate?: Date | null;
    },
  ) {
    authorizationService.assertAdminOrPmOrDeveloper(actor);

    if (actor.role === 'DEVELOPER') {
      const hasNonStatusField =
        input.title !== undefined ||
        input.description !== undefined ||
        input.priority !== undefined ||
        input.assigneeId !== undefined ||
        input.dueDate !== undefined;

      if (hasNonStatusField) {
        throw forbidden('Developers may only update task status');
      }

      if (input.status === undefined) {
        throw forbidden('Developers may only update task status');
      }
    }

    let existing;

    if (actor.role === 'DEVELOPER') {
      existing = await taskRepository.findByIdForDeveloper(id, actor.id);
    } else if (actor.role === 'PROJECT_MANAGER') {
      existing = await taskRepository.findByIdForPm(id, actor.id);
    } else {
      existing = await taskRepository.findById(id);
    }

    if (!existing) {
      throw notFound('Task not found');
    }

    if (input.assigneeId) {
      const developer = await userRepository.findDeveloperById(input.assigneeId);
      if (!developer) {
        throw notFound('Developer not found');
      }
    }

    const nextStatus = input.status ?? existing.status;
    const nextDueDate = input.dueDate !== undefined ? input.dueDate : existing.dueDate;
    const overdueClear = getOverdueClearFields(nextStatus, nextDueDate);

    const updateData: Record<string, unknown> = {
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
      ...(input.priority !== undefined ? { priority: input.priority } : {}),
      ...(input.dueDate !== undefined ? { dueDate: input.dueDate } : {}),
      ...(input.assigneeId !== undefined
        ? input.assigneeId
          ? { assignee: { connect: { id: input.assigneeId } } }
          : { assignee: { disconnect: true } }
        : {}),
    };

    Object.assign(updateData, overdueClear);

    const statusChanged = input.status !== undefined && input.status !== existing.status;
    const assignmentChanged = actor.role !== 'DEVELOPER' && Boolean(input.assigneeId) && input.assigneeId !== existing.assigneeId;
    let updated;
    let activityIds: string[] = [];
    let notifications: Array<{ userId: string; notification: Awaited<ReturnType<typeof notificationService.create>> }> = [];

    if (statusChanged || assignmentChanged) {
      const txResult = await prisma.$transaction(async (tx) => {
        const updatedTask = await tx.task.update({ where: { id }, data: updateData as Prisma.TaskUpdateInput, include: { project: { select: { id: true, name: true, createdById: true } }, assignee: { select: { id: true, name: true, email: true } } } });
        const ids: string[] = [];
        const createdNotifications: Array<{ userId: string; notification: Awaited<ReturnType<typeof notificationService.create>> }> = [];
        if (statusChanged) {
          const activity = await activityService.logTaskStatusChange({ taskId: updatedTask.id, projectId: updatedTask.projectId, actorId: actor.id, previousStatus: existing.status, newStatus: input.status!, taskTitle: updatedTask.title }, tx);
          ids.push(activity.id);
        }
        if (assignmentChanged && input.assigneeId) {
          const assignee = await userRepository.findById(input.assigneeId);
          const activity = await activityService.logTaskAssigned({ taskId: updatedTask.id, projectId: updatedTask.projectId, actorId: actor.id, taskTitle: updatedTask.title, assigneeName: assignee?.name ?? 'Developer' }, tx);
          ids.push(activity.id);
          createdNotifications.push({ userId: input.assigneeId, notification: await notificationService.create({ userId: input.assigneeId, type: NotificationType.TASK_ASSIGNED, title: 'Task assigned', message: `You were assigned to task "${updatedTask.title}"`, projectId: updatedTask.projectId, taskId: updatedTask.id }, tx) });
        }
        if (statusChanged && input.status === 'IN_REVIEW') {
          const ownerId = updatedTask.project.createdById;
          createdNotifications.push({ userId: ownerId, notification: await notificationService.create({ userId: ownerId, type: NotificationType.TASK_IN_REVIEW, title: 'Task ready for review', message: `Task "${updatedTask.title}" moved to review`, projectId: updatedTask.projectId, taskId: updatedTask.id }, tx) });
        }
        return { updatedTask, ids, createdNotifications };
      });
      updated = txResult.updatedTask; activityIds = txResult.ids; notifications = txResult.createdNotifications;
    } else {
      updated = await taskRepository.update(id, updateData);
    }

    const emitter = getWebSocketEmitter();
    if (emitter) {
      for (const activityId of activityIds) {
        const activity = await activityLogRepository.findByIdWithRelations(activityId);
        if (activity) await emitter.emitActivity(activity);
      }
      if (statusChanged) emitter.emitTaskStatusChanged(updated, existing.status, input.status!);
    }
    for (const item of notifications) await notificationService.emitCreated(item.userId, item.notification);

    return actor.role === 'DEVELOPER' ? mapTaskForDeveloper(updated) : updated;
  },

  async delete(actor: AuthUser, id: string) {
    authorizationService.assertAdminOrPm(actor);

    const existing =
      actor.role === 'ADMIN'
        ? await taskRepository.findById(id)
        : await taskRepository.findByIdForPm(id, actor.id);

    if (!existing) {
      throw notFound('Task not found');
    }

    return taskRepository.delete(id);
  },
};
