import express from "express";
import cors from "cors";
import { PrismaClient } from "@prisma/client";

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 10000;

app.use(cors());
app.use(express.json());

// Salud
app.get("/", (_req, res) => {
  res.json({ status: "Servidor funcionando 🔥", version: "1.0.0" });
});

// Listar usuarios
app.get("/api/users", async (_req, res) => {
  const items = await prisma.usuario.findMany({ orderBy: { id: "desc" } });
  res.json(items);
});

// Crear usuario
app.post("/api/users", async (req, res) => {
  const { nombre, email } = req.body || {};
  if (!nombre || !email) return res.status(400).json({ error: "nombre y email son requeridos" });
  const created = await prisma.usuario.create({ data: { nombre, email } });
  res.status(201).json(created);
});

// Obtener uno
app.get("/api/users/:id", async (req, res) => {
  const id = Number(req.params.id);
  const item = await prisma.usuario.findUnique({ where: { id } });
  if (!item) return res.status(404).json({ error: "No encontrado" });
  res.json(item);
});

// Actualizar
app.put("/api/users/:id", async (req, res) => {
  const id = Number(req.params.id);
  const { nombre, email } = req.body || {};
  const updated = await prisma.usuario.update({
    where: { id },
    data: { ...(nombre && { nombre }), ...(email && { email }) },
  });
  res.json(updated);
});

// Borrar
app.delete("/api/users/:id", async (req, res) => {
  const id = Number(req.params.id);
  await prisma.usuario.delete({ where: { id } });
  res.status(204).end();
});

app.listen(PORT, () => {
  console.log(`API lista en puerto ${PORT}`);
});
