import type { Request, Response, NextFunction } from 'express';
import type { TaskPriority, TaskStatus } from '@prisma/client';
import { taskService } from '../services/task.service';
import type { AuthUser } from '../types/auth';

function parseOptionalDate(value: string | null | undefined): Date | null | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (value === null) {
    return null;
  }
  return new Date(value);
}

export const taskController = {
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const query = req.validatedQuery as {
        status?: TaskStatus;
        priority?: TaskPriority;
        dueDateFrom?: string;
        dueDateTo?: string;
        projectId?: string;
        assigneeId?: string;
        isOverdue?: boolean;
        page: number;
        limit: number;
      };
      const result = await taskService.list(req.user!, {
        status: query.status,
        priority: query.priority,
        dueDateFrom: query.dueDateFrom ? new Date(query.dueDateFrom) : undefined,
        dueDateTo: query.dueDateTo ? new Date(query.dueDateTo) : undefined,
        projectId: query.projectId,
        assigneeId: query.assigneeId,
        isOverdue: query.isOverdue,
        page: query.page,
        limit: query.limit,
      });
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  },

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const task = await taskService.getById(req.user!, req.params.id as string);
      res.status(200).json({ data: task });
    } catch (error) {
      next(error);
    }
  },

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const body = req.body as {
        title: string;
        description?: string;
        status?: TaskStatus;
        priority?: TaskPriority;
        projectId: string;
        assigneeId?: string;
        dueDate?: string;
      };
      const task = await taskService.create(req.user!, {
        title: body.title,
        description: body.description,
        status: body.status,
        priority: body.priority,
        projectId: body.projectId,
        assigneeId: body.assigneeId,
        dueDate: body.dueDate ? new Date(body.dueDate) : undefined,
      });
      res.status(201).json({ data: task });
    } catch (error) {
      next(error);
    }
  },

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const actor = req.user as AuthUser;
      const body = req.body as Record<string, unknown>;

      const input =
        actor.role === 'DEVELOPER'
          ? { status: body.status as TaskStatus }
          : {
              title: body.title as string | undefined,
              description: body.description as string | null | undefined,
              status: body.status as TaskStatus | undefined,
              priority: body.priority as TaskPriority | undefined,
              assigneeId: body.assigneeId as string | null | undefined,
              dueDate: parseOptionalDate(body.dueDate as string | null | undefined),
            };

      const task = await taskService.update(actor, req.params.id as string, input);
      res.status(200).json({ data: task });
    } catch (error) {
      next(error);
    }
  },

  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await taskService.delete(req.user!, req.params.id as string);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  },
};
