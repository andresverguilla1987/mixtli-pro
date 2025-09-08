// Lightweight /metrics handler with optional bearer token
import type { IncomingMessage, ServerResponse } from 'http';
import { Registry } from 'prom-client';

export default function metricsRouter(register: Registry) {
  const token = process.env.METRICS_TOKEN;
  return async function handler(req: any, res: any) {
    if (token) {
      const auth = (req.headers?.authorization as string) || '';
      if (auth !== `Bearer ${token}`) {
        res.statusCode = 401;
        res.end('unauthorized');
        return;
      }
    }
    res.setHeader('Content-Type', register.contentType);
    res.end(await register.metrics());
  };
}
