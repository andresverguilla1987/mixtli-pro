import pino from 'pino';
import pinoHttp from 'pino-http';
import { randomUUID } from 'node:crypto';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info'
});

export function applyLogging(app: any) {
  app.use(pinoHttp({
    logger,
    genReqId: (req: any) => (req.headers['x-request-id'] as string) || randomUUID(),
    autoLogging: {
      ignore: (req: any) => req.url === '/salud' || req.url === '/live' || req.url === '/ready'
    }
  }));
}

export default logger;
