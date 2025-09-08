import pino from 'pino';
import pinoHttp from 'pino-http';
import type { Request, Response } from 'express';

const level = process.env.LOG_LEVEL || 'info';
const baseLogger = pino({ level });

export default function logger() {
  return pinoHttp({
    logger: baseLogger,
    customProps: (req: Request & { requestId?: string }, res: Response & { locals?: any }) => ({
      requestId: (req as any).requestId || res.locals?.requestId,
      service: process.env.SERVICE_NAME || 'mixtli-api',
      env: process.env.NODE_ENV || 'development',
    }),
    serializers: {
      req(req: any) {
        return {
          method: req.method,
          url: req.url,
          headers: { 'x-request-id': req.requestId },
          remoteAddress: req.socket && req.socket.remoteAddress,
        };
      },
    },
  });
}
