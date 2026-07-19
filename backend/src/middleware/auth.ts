import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { HttpError } from '../utils/http-error';

export interface AuthedRequest extends Request {
  auth?: { kind: 'api-key' } | { kind: 'session'; address: string };
}

/** Accepts either the dev API key or a wallet-session JWT as a Bearer token. */
export function requireAuth(req: AuthedRequest, _res: Response, next: NextFunction): void {
  const header = req.header('authorization') ?? '';
  const token = header.startsWith('Bearer ') ? header.slice('Bearer '.length) : '';
  if (!token) return next(HttpError.unauthorized('missing bearer token'));

  if (token === config.apiKey) {
    req.auth = { kind: 'api-key' };
    return next();
  }

  try {
    const payload = jwt.verify(token, config.jwtSecret) as { sub?: string };
    if (!payload.sub) throw new Error('missing sub');
    req.auth = { kind: 'session', address: payload.sub };
    return next();
  } catch {
    return next(HttpError.unauthorized('invalid token'));
  }
}

/** Admin routes additionally require the x-admin-key header. */
export function requireAdmin(req: Request, _res: Response, next: NextFunction): void {
  if (req.header('x-admin-key') !== config.adminKey) {
    return next(HttpError.forbidden('admin key required'));
  }
  next();
}
