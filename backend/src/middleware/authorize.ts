import type { Request, Response, NextFunction } from 'express';
import type { UserRole } from '@prisma/client';
import { forbidden, unauthorized } from '../utils/api-error';

export function authorize(...roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(unauthorized());
      return;
    }

    if (!roles.includes(req.user.role)) {
      next(forbidden('You do not have permission to perform this action'));
      return;
    }

    next();
  };
}
