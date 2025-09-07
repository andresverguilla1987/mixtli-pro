import { Router, Request, Response, NextFunction } from "express";
import client from "prom-client";

export const register = new client.Registry();
client.collectDefaultMetrics({ register });

const httpDuration = new client.Histogram({
  name: "http_request_duration_seconds",
  help: "HTTP request duration in seconds",
  labelNames: ["method", "path", "status"],
  buckets: [0.005,0.01,0.025,0.05,0.1,0.25,0.5,1,2,5,10]
});
register.registerMetric(httpDuration);

const httpRequests = new client.Counter({
  name: "http_requests_total",
  help: "Total HTTP requests",
  labelNames: ["method", "path", "status"],
});
register.registerMetric(httpRequests);

export function metricsMiddleware(req: Request, res: Response, next: NextFunction) {
  const start = process.hrtime.bigint();
res.on("finish", () => {
    const routePath = (req as any).route?.path || req.path || "unknown";
    httpRequests.inc({ method: req.method, path: routePath, status: String(res.statusCode) }, 1);
    const dur = Number(process.hrtime.bigint() - start) / 1e9; httpDuration.observe({ method: req.method, path: routePath, status: String(res.statusCode) }, dur);
  });
  next();
}

export const metricsRouter = Router();
metricsRouter.get("/metrics", async (_req, res) => {
  res.set("Content-Type", register.contentType);
  res.end(await register.metrics());
});
