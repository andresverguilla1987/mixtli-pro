import express from "express";
import cors from "cors";
import morgan from "morgan";
import * as Sentry from "@sentry/node";
import { nodeProfilingIntegration } from "@sentry/profiling-node";
import { metricsMiddleware, metricsRouter } from "./metrics.js";
import { PrismaClient } from "@prisma/client";
import { router as wfmRouter } from "./wfm.js";
import { router as scoringRouter } from "./scoring.js";
import { router as rulesRouter } from "./rules.js";
import { router as auditRouter } from "./audit.js";
import fs from "fs";
import { createOpenApi } from "./swagger.js";

const app = express();
const prisma = new PrismaClient();

Sentry.init({
  dsn: process.env.SENTRY_DSN || undefined,
  tracesSampleRate: 0.2,
  integrations: [nodeProfilingIntegration()],
  environment: process.env.APP_ENV || "production",
});

const PORT = process.env.PORT ? Number(process.env.PORT) : 8080;

app.use(cors());
app.use(Sentry.Handlers.requestHandler());
app.use(express.json({ limit: "2mb" }));
app.use(morgan("tiny"));
app.use(metricsMiddleware);

app.get("/health", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: "ok", time: new Date().toISOString() });
  } catch (e) {
    res.status(500).json({ status: "error", error: (e as Error).message });
  }
});

app.use("/wfm", wfmRouter);
app.use("/scoring", scoringRouter);
app.use("/rules", rulesRouter);
app.use("/audit", auditRouter);

// Serve OpenAPI spec
app.get("/openapi.yaml", (_req, res) => {
  const spec = createOpenApi();
  res.type("text/yaml").send(spec);
});

app.use(metricsRouter);
app.use(Sentry.Handlers.errorHandler());

app.listen(PORT, () => {
  console.log(`🚀 API listening on :${PORT}`);
});
