// src/server.cjs — production CJS entrypoint
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const { PrismaClient } = require("@prisma/client");
dotenv.config();

const prisma = new PrismaClient();
const app = express();

// Middleware
app.use(cors({ origin: "*", methods: ["GET","POST","PUT","PATCH","DELETE"], allowedHeaders: ["Content-Type","Authorization"] }));
app.use(express.json({ limit: "5mb" }));

// Health
app.get("/api/health", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ ok: true, db: "ok", ts: new Date().toISOString(), build: "MIXTLI-PROD-CORRECTOR" });
  } catch (e) {
    res.status(200).json({ ok: true, db: "error", error: String(e), ts: new Date().toISOString(), build: "MIXTLI-PROD-CORRECTOR" });
  }
});

// Auth routes
const authRouter = require("./rutas/auth.cjs");
app.use("/api/auth", authRouter);

// 404
app.use((_req, res) => res.status(404).json({ error: "Not found" }));

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 API en puerto ${PORT} (PROD Corrector)`));

module.exports = { app, prisma };
