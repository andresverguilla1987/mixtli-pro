// src/server.cjs  (ENTRYPOINT CJS)
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const { PrismaClient } = require("@prisma/client");
dotenv.config();

const prisma = new PrismaClient();
const app = express();

app.use(cors({ origin: "*", methods: ["GET","POST","PUT","PATCH","DELETE"], allowedHeaders: ["Content-Type","Authorization"] }));
app.use(express.json({ limit: "5mb" }));

console.log(">>> Mixtli CJS src/ build MIXTLI-CJS-SRC-OK");

app.get("/api/health", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ ok: true, db: "ok", ts: new Date().toISOString(), build: "MIXTLI-CJS-SRC-OK" });
  } catch (e) {
    res.status(200).json({ ok: true, db: "error", error: String(e), ts: new Date().toISOString(), build: "MIXTLI-CJS-SRC-OK" });
  }
});

// monta auth
const authRouter = require("./rutas/auth.cjs");
app.use("/api/auth", authRouter);

// debug opcional
app.get("/__routes", (_req, res) => {
  const list = [];
  app._router.stack.forEach(m => {
    if (m.route?.path) list.push({ method: Object.keys(m.route.methods).join(",").toUpperCase(), path: m.route.path });
    else if (m.name === "router" && m.handle?.stack) {
      m.handle.stack.forEach(h => h.route && list.push({ method: Object.keys(h.route.methods).join(",").toUpperCase(), path: h.route.path }));
    }
  });
  res.json(list);
});

app.use((_req, res) => res.status(404).json({ error: "Not found" }));

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 API en puerto ${PORT} (CJS src/)`));

module.exports = { app, prisma };
