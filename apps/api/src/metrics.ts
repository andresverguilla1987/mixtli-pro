import client from "prom-client";
import type { Request, Response } from "express";

client.collectDefaultMetrics();

export const httpRequestDuration = new client.Histogram({
  name: "http_request_duration_seconds",
  help: "HTTP latency",
  labelNames: ["method", "route", "code"],
  buckets: [0.025, 0.05, 0.1, 0.25, 0.5, 1, 2, 5],
});

export function metricsHandler(_req: Request, res: Response) {
  res.set("Content-Type", client.register.contentType);
  res.end(client.register.metrics());
}
