// src/server.cjs — PROD + lite diag
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const { PrismaClient } = require("@prisma/client");
dotenv.config();

const prisma = new PrismaClient();
const app = express();

app.use(cors({ origin: "*", methods: ["GET","POST","PUT","PATCH","DELETE"], allowedHeaders: ["Content-Type","Authorization"] }));
app.use(express.json({ limit: "5mb" }));

app.get("/api/health", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ ok: true, db: "ok", ts: new Date().toISOString(), build: "MIXTLI-PROD-CORRECTOR" });
  } catch (e) {
    res.status(200).json({ ok: true, db: "error", error: String(e), ts: new Date().toISOString(), build: "MIXTLI-PROD-CORRECTOR" });
  }
});

// auth
const authRouter = require("./rutas/auth.cjs");
app.use("/api/auth", authRouter);

// --- LITE DIAG ---
app.post("/api/echo", (req, res) => res.json({ ok: true, received: req.body ?? null }));
app.get("/__routes", (_req, res) => {
  const list = [];
  const stack = app._router?.stack || [];
  stack.forEach(layer => {
    if (layer.route?.path) {
      list.push({ method: Object.keys(layer.route.methods).join(",").toUpperCase(), path: layer.route.path });
    } else if (layer.name === "router" && layer.handle?.stack) {
      layer.handle.stack.forEach(h => {
        if (h.route?.path) {
          const methods = Object.keys(h.route.methods).join(",").toUpperCase();
          list.push({ method: methods, path: "/api/auth" + (h.route.path === "/" ? "" : h.route.path) });
        }
      });
    }
  });
  res.json(list);
});

app.use((_req, res) => res.status(404).json({ error: "Not found" }));

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 API en puerto ${PORT} (PROD + lite diag)`));

module.exports = { app, prisma };
