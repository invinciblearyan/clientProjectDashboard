import type { Request, Response, NextFunction } from 'express';
import { clientService } from '../services/client.service';

export const clientController = {
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { page, limit } = req.validatedQuery as { page: number; limit: number };
      const result = await clientService.list(req.user!, page, limit);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  },

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const client = await clientService.getById(req.user!, req.params.id as string);
      res.status(200).json({ data: client });
    } catch (error) {
      next(error);
    }
  },

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const client = await clientService.create(req.user!, req.body);
      res.status(201).json({ data: client });
    } catch (error) {
      next(error);
    }
  },

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const client = await clientService.update(req.user!, req.params.id as string, req.body);
      res.status(200).json({ data: client });
    } catch (error) {
      next(error);
    }
  },

  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await clientService.delete(req.user!, req.params.id as string);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  },
};
