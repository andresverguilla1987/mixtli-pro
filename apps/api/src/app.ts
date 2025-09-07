// apps/api/src/app.ts (patched)
import express from "express";
import cors from "cors";
import morgan from "morgan";
import * as Sentry from "@sentry/node";

export const app = express();

app.use(cors());
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/__health", (_req, res) => res.json({ ok: true }));

// Sentry v8 handler (safe even if v7)
(Sentry as any).setupExpressErrorHandler?.(app);

app.use((_req, res) => res.status(404).json({ error: "Not Found" }));

// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: any, _req: any, res: any, _next: any) => {
  if (process.env.NODE_ENV !== "production") console.error("[API ERROR]", err);
  res.status(typeof err?.status === "number" ? err.status : 500).json({ error: "Internal Server Error" });
});

export const PORT = Number(process.env.PORT ?? 3000);
export default app;
