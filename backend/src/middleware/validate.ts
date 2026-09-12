import type { Request, Response, NextFunction } from 'express';
import type { ZodType } from 'zod';

type RequestSource = 'body' | 'query' | 'params';

export function validate(schema: ZodType, source: RequestSource = 'body') {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[source]);

    if (!result.success) {
      next(result.error);
      return;
    }

    if (source === 'body') {
      req.body = result.data;
    } else if (source === 'query') {
      req.validatedQuery = result.data;
    } else {
      req.validatedParams = result.data;
    }

    next();
  };
}
