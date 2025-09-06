// src/server.cjs — PROD CLEAN (sin rutas de diagnóstico)
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const { PrismaClient } = require("@prisma/client");
dotenv.config();

const prisma = new PrismaClient();
const app = express();

app.use(cors({ origin: "*", methods: ["GET","POST","PUT","PATCH","DELETE"], allowedHeaders: ["Content-Type","Authorization"] }));
app.use(express.json({ limit: "5mb" }));

// Health
app.get("/api/health", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ ok: true, db: "ok", ts: new Date().toISOString(), build: "MIXTLI-PROD-CLEAN" });
  } catch (e) {
    // salud sigue en 200 para no romper healthcheck de Render
    res.status(200).json({ ok: true, db: "error", error: String(e), ts: new Date().toISOString(), build: "MIXTLI-PROD-CLEAN" });
  }
});

// Auth
const authRouter = require("./rutas/auth.cjs");
app.use("/api/auth", authRouter);

// 404
app.use((_req, res) => res.status(404).json({ error: "Not found" }));

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 API en puerto ${PORT} (PROD CLEAN)`));

module.exports = { app, prisma };
