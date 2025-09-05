// src/server.cjs - CommonJS entrypoint
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const { PrismaClient } = require("@prisma/client");
dotenv.config();

const prisma = new PrismaClient();
const app = express();

app.use(cors({ origin: "*", methods: ["GET","POST","PUT","PATCH","DELETE"], allowedHeaders: ["Content-Type","Authorization"] }));
app.use(express.json({ limit: "5mb" }));

console.log(">>> Iniciando Mixtli Pro CJS (estructura src/) - build MIXTLI-CJS-SRC-2025-09-04");

app.get("/api/health", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ ok: true, db: "ok", ts: new Date().toISOString(), build: "MIXTLI-CJS-SRC-2025-09-04" });
  } catch (e) {
    res.status(200).json({ ok: true, db: "error", error: String(e), ts: new Date().toISOString(), build: "MIXTLI-CJS-SRC-2025-09-04" });
  }
});

const authRouter = require("./rutas/auth.cjs");
app.use("/api/auth", authRouter);

app.get("/__routes", (_req, res) => {
  const list = [];
  app._router.stack.forEach(m => {
    if (m.route && m.route.path) {
      const methods = Object.keys(m.route.methods).join(",").toUpperCase();
      list.push({ method: methods, path: m.route.path });
    } else if (m.name === "router" && m.handle?.stack) {
      m.handle.stack.forEach(h => {
        if (h.route) {
          const methods = Object.keys(h.route.methods).join(",").toUpperCase();
          list.push({ method: methods, path: h.route.path });
        }
      });
    }
  });
  res.json(list);
});

app.use((_req, res) => res.status(404).json({ error: "Not found" }));

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 API en puerto ${PORT} (CJS src/)`));

module.exports = { app, prisma };
