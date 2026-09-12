import type { NextFunction, Request, Response } from 'express';
import { notificationService } from '../services/notification.service';

export const notificationController = {
  async list(req: Request, res: Response, next: NextFunction) { try { res.status(200).json({ data: await notificationService.list(req.user!.id) }); } catch (error) { next(error); } },
  async unreadCount(req: Request, res: Response, next: NextFunction) { try { res.status(200).json({ data: { unreadCount: await notificationService.unreadCount(req.user!.id) } }); } catch (error) { next(error); } },
  async markRead(req: Request, res: Response, next: NextFunction) { try { await notificationService.markRead(req.user!.id, req.params.id as string); res.status(204).send(); } catch (error) { next(error); } },
  async markAllRead(req: Request, res: Response, next: NextFunction) { try { await notificationService.markAllRead(req.user!.id); res.status(204).send(); } catch (error) { next(error); } },
};
