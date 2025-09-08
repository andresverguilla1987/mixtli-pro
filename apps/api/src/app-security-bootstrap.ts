// Helper to wire security middlewares into your Express app.
// Usage in your app.ts BEFORE routes:
// import applySecurity from './app-security-bootstrap';
// applySecurity(app);
import cors from './middleware/security/cors';
import apiLimiter from './middleware/security/rateLimit';
import helmet from './middleware/security/helmet';

export function applySecurity(app: any) {
  try { app.disable?.('x-powered-by'); } catch {}
  app.use(helmet);
  app.use(cors);
  // You can scope limiter only to API routes if you prefer:
  app.use('/api', apiLimiter);
}

export default applySecurity;
