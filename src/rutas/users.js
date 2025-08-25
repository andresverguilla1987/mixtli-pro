const express = require("express");
const { PrismaClient } = require("@prisma/client");
const router = express.Router();
const prisma = new PrismaClient();

// Lista
router.get("/", async (_req, res, next) => {
  try {
    const data = await prisma.usuario.findMany({ orderBy: { id: "asc" } });
    res.json({ ok: true, data });
  } catch (err) { next(err); }
});

// Crear
router.post("/", async (req, res, next) => {
  try {
    const { nombre, email } = req.body || {};
    if (!nombre || !email) return res.status(400).json({ ok: false, error: "nombre y email son requeridos" });
    const out = await prisma.usuario.create({ data: { nombre, email } });
    res.status(201).json({ ok: true, data: out });
  } catch (err) {
    if (err.code === "P2002") return res.status(409).json({ ok: false, error: "email ya existe" });
    next(err);
  }
});

// Actualizar
router.put("/:id", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ ok: false, error: "id inválido" });
    const { nombre, email } = req.body || {};
    const out = await prisma.usuario.update({
      where: { id },
      data: { ...(nombre && { nombre }), ...(email && { email }) }
    });
    res.json({ ok: true, data: out });
  } catch (err) {
    if (err.code === "P2002") return res.status(409).json({ ok: false, error: "email ya existe" });
    if (err.code === "P2025") return res.status(404).json({ ok: false, error: "Usuario no encontrado" });
    next(err);
  }
});

// Eliminar
router.delete("/:id", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ ok: false, error: "id inválido" });
    const out = await prisma.usuario.delete({ where: { id } });
    res.json({ ok: true, data: out });
  } catch (err) {
    if (err.code === "P2025") return res.status(404).json({ ok: false, error: "Usuario no encontrado" });
    next(err);
  }
});

module.exports = router;
