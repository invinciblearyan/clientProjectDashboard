import type { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service';
import { env } from '../config/env';
import { setRefreshTokenCookie, clearRefreshTokenCookie } from '../utils/cookie';

export const authController = {
  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await authService.login(req.body.email, req.body.password, req);
      setRefreshTokenCookie(res, result.refreshToken);

      res.status(200).json({
        data: {
          accessToken: result.accessToken,
          user: result.user,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  async refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const refreshToken = req.cookies?.[env.refreshCookieName] as string | undefined;
      const result = await authService.refresh(refreshToken, req);
      setRefreshTokenCookie(res, result.refreshToken);

      res.status(200).json({
        data: {
          accessToken: result.accessToken,
          user: result.user,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const refreshToken = req.cookies?.[env.refreshCookieName] as string | undefined;
      await authService.logout(refreshToken);
      clearRefreshTokenCookie(res);
      res.status(200).json({ message: 'Logged out successfully' });
    } catch (error) {
      next(error);
    }
  },

  async me(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await authService.getCurrentUser(req.user!);
      res.status(200).json({ data: user });
    } catch (error) {
      next(error);
    }
  },
};
