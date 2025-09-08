import { randomUUID } from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';

export default function requestId(headerName = 'x-request-id') {
  return function(req: Request & { requestId?: string }, res: Response & { locals: any }, next: NextFunction) {
    const incoming = (req.headers[headerName] as string | undefined)?.trim();
    const id = incoming || randomUUID();
    (req as any).requestId = id;
    (res as any).locals = (res as any).locals || {};
    (res as any).locals.requestId = id;
    res.setHeader(headerName, id);
    next();
  };
}
