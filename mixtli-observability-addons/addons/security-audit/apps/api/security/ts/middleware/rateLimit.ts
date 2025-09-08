import rateLimit from 'express-rate-limit';
import client from 'prom-client';
import { RequestHandler } from 'express';

const limiter429 = new client.Counter({
  name: 'http_429_total',
  help: 'Respuestas 429 (rate limit)',
  labelNames: ['route', 'ip'] as const
});

export default function makeLimiter(opts: { windowMs?: number; limit?: number } = {}): RequestHandler {
  const limiter = rateLimit({
    windowMs: opts.windowMs ?? 60_000,
    limit: opts.limit ?? 120,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler(req: any, res: any) {
      limiter429.inc({ route: req.route?.path || req.path, ip: req.ip || 'unknown' } as any);
      res.status(429).json({ ok: false, error: 'Too Many Requests' });
    }
  });
  return limiter as unknown as RequestHandler;
}
