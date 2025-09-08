// Lightweight security & hardening bootstrap for Express apps
// Usage in apps/api/src/app.ts (before routes):
//   import applySecurity from './app-security-bootstrap';
//   applySecurity(app);

import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';

type AnyExpress = any;

export default function applySecurity(app: AnyExpress) {
  // Behind Render/NGINX we want to honor X-Forwarded-* for rate limiting
  try { app.set?.('trust proxy', 1); } catch {}

  app.use(helmet({
    contentSecurityPolicy: false, // disable strict CSP by default; tune if you serve views
    crossOriginResourcePolicy: { policy: 'cross-origin' }
  }));

  app.use(cors({
    origin: '*',
    methods: ['GET','HEAD','POST','PUT','PATCH','DELETE','OPTIONS'],
    allowedHeaders: ['Content-Type','Authorization','X-Requested-With'],
    maxAge: 600
  }));

  // Basic rate limit (per-IP) — adjust to your traffic patterns
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX ?? '300', 10),
    standardHeaders: true,
    legacyHeaders: false
  });

  app.use(limiter);
}
