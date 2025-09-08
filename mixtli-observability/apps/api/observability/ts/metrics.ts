import express from 'express';
import client from 'prom-client';

export const register = new client.Registry();
client.collectDefaultMetrics({ register });

export const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'route', 'status_code'] as const,
  buckets: [0.05, 0.1, 0.25, 0.5, 1, 2, 5],
});
register.registerMetric(httpRequestDuration);

const httpRequestsTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'route', 'status_code'] as const,
});
register.registerMetric(httpRequestsTotal);

export function instrument(app: any) {
  app.use((req: any, res: any, next: any) => {
    const end = (httpRequestDuration as any).startTimer({ method: req.method, route: req.path });
    res.on('finish', () => {
      const labels = { method: req.method, route: (req.route?.path || req.path), status_code: res.statusCode };
      (httpRequestsTotal as any).inc(labels);
      end({ status_code: res.statusCode, method: req.method, route: (req.route?.path || req.path) });
    });
    next();
  });
}

export const metricsRouter = express.Router();
metricsRouter.get('/', async (_req, res) => {
  res.set('Content-Type', (register as any).contentType);
  res.end(await (register as any).metrics());
});
