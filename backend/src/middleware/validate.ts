import { NextFunction, Request, Response } from 'express';
import { ZodType } from 'zod';

/** Parses and replaces req.body with the schema's output, or 400s via the error handler. */
export function validateBody<T>(schema: ZodType<T>) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) return next(result.error);
    req.body = result.data;
    next();
  };
}
