import { Router, Request, Response, NextFunction } from "express";
import client from "prom-client";

export const register = new client.Registry();
client.collectDefaultMetrics({ register });

const httpRequests = new client.Counter({
  name: "http_requests_total",
  help: "Total HTTP requests",
  labelNames: ["method", "path", "status"],
});
register.registerMetric(httpRequests);

export function metricsMiddleware(req: Request, res: Response, next: NextFunction) {
  res.on("finish", () => {
    const routePath = (req as any).route?.path || req.path || "unknown";
    httpRequests.inc({ method: req.method, path: routePath, status: String(res.statusCode) }, 1);
  });
  next();
}

export const metricsRouter = Router();
metricsRouter.get("/metrics", async (_req, res) => {
  res.set("Content-Type", register.contentType);
  res.end(await register.metrics());
});
