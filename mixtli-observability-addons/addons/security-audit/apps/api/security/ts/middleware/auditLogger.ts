import { Request, Response, NextFunction } from 'express';
export default function auditLogger() {
  return function(req: Request & { requestId?: string, user?: any }, res: Response & { locals?: any }, next: NextFunction) {
    res.on('finish', () => {
      if (!['POST','PUT','PATCH','DELETE'].includes(req.method)) return;
      const entry = {
        audit: true,
        method: req.method,
        route: (req as any).route?.path || req.path,
        status: res.statusCode,
        userId: (req as any).user?.id || (req.headers['x-user-id'] as string) || null,
        tenant: (req.headers['x-tenant-id'] as string) || null,
        requestId: (req as any).requestId,
        ts: new Date().toISOString(),
      };
      const anyReq = req as any;
      if (anyReq.log && typeof anyReq.log.info === 'function') anyReq.log.info(entry, 'audit');
      else console.log(JSON.stringify(entry));
    });
    next();
  }
}
