// apps/api/src/app.ts — Migrado a Sentry v8+ (Express, ESM/TypeScript)
// Reemplaza tu archivo con este si hoy truena por `Sentry.Handlers.*`

import express from "express";
import cors from "cors";
import morgan from "morgan";
import * as Sentry from "@sentry/node";

export const app = express();

// Middlewares base
app.use(cors());
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- Rutas (coloca tus routers reales aquí) ---
app.get("/__health", (_req, res) => {
  res.json({ ok: true, service: "mixtli-api", ts: new Date().toISOString() });
});
// Ejemplos para guiarte: descomenta y ajusta si ya los tienes
// import authRouter from "./routes/auth";
// app.use("/api/auth", authRouter);
// import filesRouter from "./routes/files";
// app.use("/api/files", filesRouter);
// ----------------------------------------------

// Sentry v8: único handler de errores (sustituye a Handlers.*)
// Colócalo DESPUÉS de definir tus rutas, y ANTES de tu error-handler propio.
Sentry.setupExpressErrorHandler(app);

// 404 (si no coincide ninguna ruta)
app.use((_req, res) => {
  res.status(404).json({ error: "Not Found" });
});

// Error handler propio (después del de Sentry)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: any, _req: any, res: any, _next: any) => {
  if (process.env.NODE_ENV !== "production") {
    console.error("[API ERROR]", err);
  }
  const status = (typeof err?.status === "number" && err.status) || 500;
  res.status(status).json({ error: "Internal Server Error" });
});

export default app;
