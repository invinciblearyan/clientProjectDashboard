import type { Request, Response, NextFunction } from 'express';
import type { ProjectStatus } from '@prisma/client';
import { projectService } from '../services/project.service';

function parseOptionalDate(value: string | null | undefined): Date | null | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (value === null) {
    return null;
  }
  return new Date(value);
}

export const projectController = {
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const query = req.validatedQuery as {
        status?: ProjectStatus;
        clientId?: string;
        page: number;
        limit: number;
      };
      const result = await projectService.list(req.user!, query);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  },

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const project = await projectService.getById(req.user!, req.params.id as string);
      res.status(200).json({ data: project });
    } catch (error) {
      next(error);
    }
  },

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const body = req.body as {
        name: string;
        description?: string;
        status?: ProjectStatus;
        clientId: string;
        startDate?: string;
        dueDate?: string;
      };
      const project = await projectService.create(req.user!, {
        name: body.name,
        description: body.description,
        status: body.status,
        clientId: body.clientId,
        startDate: body.startDate ? new Date(body.startDate) : undefined,
        dueDate: body.dueDate ? new Date(body.dueDate) : undefined,
      });
      res.status(201).json({ data: project });
    } catch (error) {
      next(error);
    }
  },

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const body = req.body as {
        name?: string;
        description?: string | null;
        status?: ProjectStatus;
        clientId?: string;
        startDate?: string | null;
        dueDate?: string | null;
      };
      const project = await projectService.update(req.user!, req.params.id as string, {
        name: body.name,
        description: body.description,
        status: body.status,
        clientId: body.clientId,
        startDate: parseOptionalDate(body.startDate),
        dueDate: parseOptionalDate(body.dueDate),
      });
      res.status(200).json({ data: project });
    } catch (error) {
      next(error);
    }
  },

  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await projectService.delete(req.user!, req.params.id as string);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  },
};
