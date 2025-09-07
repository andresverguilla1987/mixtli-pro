import type { Request, Response } from "express";
import { tryRedisPing, getRedisUrl } from "../lib/redis.js";

export function registerChecks(app: any) {
  const ok = (res: Response) => res.status(200).json({ status: "ok" });
  const routes = ["/", "/health", "/salud", "/status", "/ready", "/live"];
  for (const r of routes) {
    app.get(r, (_req: Request, res: Response) => ok(res));
    app.head(r, (_req: Request, res: Response) => ok(res));
  }

  // /healthz profundo con chequeo de Redis si hay URL
  app.get("/healthz", async (_req: Request, res: Response) => {
    const hasRedis = !!getRedisUrl();
    if (!hasRedis) return res.json({ status: "ok", redis: "skip" });
    const ping = await tryRedisPing();
    const healthy = ping === "ok" || ping === "skip";
    res.status(healthy ? 200 : 503).json({ status: healthy ? "ok" : "error", redis: ping });
  });
}