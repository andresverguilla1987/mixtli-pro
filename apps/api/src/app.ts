import express from "express";
import cors from "cors";
import morgan from "morgan";

export const app = express();
export const PORT: number = Number(process.env.PORT || 10000);

// Middlewares
app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

// ---- Health & root routes (GET + HEAD) ----
const okJson = (_req: any, res: any) => {
  res.status(200).json({ status: "ok", ts: new Date().toISOString() });
};
const okHead = (_req: any, res: any) => res.status(200).end();

const healthPaths = ["/", "/health", "/salud", "/status", "/ready", "/live"];
for (const p of healthPaths) {
  app.get(p, okJson);
  app.head(p, okHead);
}

// /healthz with optional Redis ping (won't fail if Redis is absent)
import { tryRedisPing } from "./lib/redis.js";
app.get("/healthz", async (_req: any, res: any) => {
  try {
    const r = await tryRedisPing();
    const redis = (r as any)?.skipped ? "skip" : ((r as any)?.ok ? "ok" : "error");
    res.status(200).json({ status: "ok", redis });
  } catch {
    res.status(200).json({ status: "ok", redis: "skip" });
  }
});

// ---- Stub API to avoid 404s while wiring real handlers ----
const USERS = "/api/users";

app.get(USERS, (_req: any, res: any) => {
  res.json({ ok: true, data: [], note: "users stub" });
});
app.post(USERS, (req: any, res: any) => {
  res.status(201).json({ ok: true, payload: req.body ?? null, note: "users stub" });
});
// accept both /api/users and /api/users/:id to avoid 404 in quick tests
app.put(new RegExp(`^${USERS}(/.*)?$`), (_req: any, res: any) => {
  res.status(200).json({ ok: true, note: "PUT users stub (provide id in real impl)" });
});
app.delete(new RegExp(`^${USERS}(/.*)?$`), (_req: any, res: any) => {
  res.status(200).json({ ok: true, note: "DELETE users stub (provide id in real impl)" });
});

// ---- Export stays named to satisfy 'import { app, PORT } from "./app.js";' ----
export default app;