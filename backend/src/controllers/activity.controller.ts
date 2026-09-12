import type { NextFunction, Request, Response } from 'express';
import { activityService } from '../services/activity.service';

export const activityController = {
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const query = req.validatedQuery as {
        projectId?: string;
        page: number;
        limit: number;
      };
      const result = await activityService.list(req.user!, query);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  },
};
