import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import pkg from "@prisma/client";

dotenv.config();
const { PrismaClient } = pkg;
export const prisma = new PrismaClient();

const app = express();
app.use(cors({ origin: "*", methods: ["GET","POST","PUT","PATCH","DELETE"], allowedHeaders: ["Content-Type","Authorization"] }));
app.use(express.json({ limit: "5mb" }));

app.get("/api/health", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ ok: true, db: "ok", ts: new Date().toISOString() });
  } catch (e) {
    res.status(200).json({ ok: true, db: "error", error: (e && e.message) || String(e), ts: new Date().toISOString() });
  }
});

import authRouter from "./routes/auth.js";
app.use("/api/auth", authRouter);

// Debug route to list express routes
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
          list.push({ method: methods, path: h.route.path, base: m.regexp?.toString() });
        }
      });
    }
  });
  res.json(list);
});

app.use((_req, res) => res.status(404).json({ error: "Not found" }));

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 API en puerto ${PORT}`));
