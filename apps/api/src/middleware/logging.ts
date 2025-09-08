import pino from 'pino';
import pinoHttp from 'pino-http';
import { randomUUID } from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  base: undefined, // cleaner logs on Render
});

export function requestId(req: Request & { id?: string }, res: Response, next: NextFunction) {
  const id = (req.headers['x-request-id'] as string) || randomUUID();
  (req as any).id = id;
  res.setHeader('x-request-id', id);
  next();
}

export const httpLogger = pinoHttp({
  logger,
  customProps: (_req, res) => ({ requestId: res.getHeader('x-request-id') }),
});
