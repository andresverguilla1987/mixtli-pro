import type { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import express from 'express';
import { requestId, httpLogger } from '../middleware/logging';

/**
 * Apply security & operability middlewares (CORS, Helmet, Logging, RateLimit).
 * Call once in app.ts after you create `const app = express();`
 */
export function applyHardening(app: Application) {
  // CORS
  const allowed = (process.env.CORS_ORIGINS || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
  app.use(cors(allowed.length ? { origin: allowed, credentials: true } : {}));

  // Security headers
  app.use(helmet({ crossOriginResourcePolicy: false }));

  // Request ID + structured logging
  app.use(requestId);
  app.use(httpLogger);

  // Body parser
  app.use(express.json());

  // Rate limit (apply only to API routes)
  const limiter = rateLimit({
    windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 60_000),
    max: Number(process.env.RATE_LIMIT_MAX || 120),
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use('/api', limiter);
}
