import { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { HttpError } from '../utils/http-error';
import { logger } from '../utils/logger';

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.message });
    return;
  }
  if (err instanceof ZodError) {
    res.status(400).json({ error: 'validation failed', details: err.flatten().fieldErrors });
    return;
  }
  const message = err instanceof Error ? err.message : String(err);
  logger.error('unhandled error', { path: req.path, message });
  res.status(500).json({ error: 'internal server error' });
}
