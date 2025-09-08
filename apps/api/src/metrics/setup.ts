import client from 'prom-client';
import metricsRouter from './router.js';

export function setupMetrics(app: any) {
  const enabled = ((process.env.METRICS_ENABLED ?? 'true') !== 'false');
  if (!enabled) return;

  // Registry
  const register = new client.Registry();
  client.collectDefaultMetrics({ register });

  // HTTP duration histogram
  const buckets = (process.env.METRICS_BUCKETS
    ? process.env.METRICS_BUCKETS.split(',').map((n) => Number(n.trim())).filter((n) => !Number.isNaN(n))
    : [0.05, 0.1, 0.3, 0.5, 1, 2.5, 5]);

  const httpRequestDuration = new client.Histogram({
    name: 'http_request_duration_seconds',
    help: 'Duration of HTTP requests in seconds',
    labelNames: ['method', 'route', 'status_code'] as const,
    buckets,
    registers: [register],
  });

  // Middleware to observe every request
  app.use((req: any, res: any, next: any) => {
    const end = httpRequestDuration.startTimer();
    res.on('finish', () => {
      const route = (req.route && req.route.path) || req.path || req.originalUrl || 'unknown';
      end({ method: req.method, route, status_code: String(res.statusCode) });
    });
    next();
  });

  // /metrics endpoint (with optional bearer)
  const metricsPath = process.env.METRICS_PATH || '/metrics';
  app.use(metricsPath, (req: any, res: any) => metricsRouter(register)(req, res));

  // Health endpoints
  const healthPath = process.env.HEALTH_PATH || '/healthz';
  const readyPath = process.env.READY_PATH || '/readyz';
  app.get(healthPath, (_req: any, res: any) => res.status(200).send('ok'));
  app.get(readyPath, (_req: any, res: any) => res.status(200).send('ok'));
}
