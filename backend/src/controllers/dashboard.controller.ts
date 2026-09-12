import type { Request, Response, NextFunction } from 'express';
import { dashboardService } from '../services/dashboard.service';

export const dashboardController = {
  async get(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await dashboardService.getDashboard(req.user!);
      res.status(200).json({ data });
    } catch (error) {
      next(error);
    }
  },
};
