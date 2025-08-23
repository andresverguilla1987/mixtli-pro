import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";
import filesRoutes from "./routes/files.js";

dotenv.config();
const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 10000;

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({ mensaje: "✨ Bienvenido a la API de Mixtli con subida estilo WeTransfer" });
});

app.get("/salud", async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ ok: true, db: "up" });
  } catch (e) {
    res.status(500).json({ ok: false, db: "down", error: String(e) });
  }
});

app.use("/api/files", filesRoutes);

app.listen(PORT, () => console.log(`🚀 Servidor en puerto ${PORT}`));
