import type { Request, Response, NextFunction } from 'express';
import { userService } from '../services/user.service';

export const userController = {
  async listDevelopers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { page, limit } = req.validatedQuery as { page: number; limit: number };
      const result = await userService.listDevelopers(req.user!, page, limit);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  },

  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { page, limit } = req.validatedQuery as { page: number; limit: number };
      const result = await userService.list(req.user!, page, limit);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  },

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await userService.getById(req.user!, req.params.id as string);
      res.status(200).json({ data: user });
    } catch (error) {
      next(error);
    }
  },

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await userService.create(req.user!, req.body);
      res.status(201).json({ data: user });
    } catch (error) {
      next(error);
    }
  },

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await userService.update(req.user!, req.params.id as string, req.body);
      res.status(200).json({ data: user });
    } catch (error) {
      next(error);
    }
  },

  async deactivate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await userService.deactivate(req.user!, req.params.id as string);
      res.status(200).json({ data: user });
    } catch (error) {
      next(error);
    }
  },
};
