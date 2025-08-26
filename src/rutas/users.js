// src/rutas/users.js
const { Router } = require("express");
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();
const router = Router();

// GET /api/users  -> no exponemos passwordHash
router.get("/", async (_req, res) => {
  try {
    const usuarios = await prisma.usuario.findMany({
      orderBy: { id: "asc" },
      select: { id: true, nombre: true, email: true, createdAt: true, updatedAt: true }
    });
    res.json({ ok: true, data: usuarios });
  } catch (err) {
    console.error("Error listando usuarios:", err);
    res.status(500).json({ ok: false, error: "Error listando usuarios" });
  }
});

// POST /api/users  { nombre, email, password }
router.post("/", async (req, res) => {
  try {
    const { nombre, email, password } = req.body || {};
    if (!nombre || !email || !password) {
      return res.status(400).json({ ok: false, error: "nombre, email y password son requeridos" });
    }
    if (String(password).length < 8) {
      return res.status(400).json({ ok: false, error: "password debe tener al menos 8 caracteres" });
    }

    const existente = await prisma.usuario.findUnique({ where: { email } });
    if (existente) {
      return res.status(409).json({ ok: false, error: "email ya existe" });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const nuevo = await prisma.usuario.create({
      data: { nombre, email, passwordHash },
      select: { id: true, nombre: true, email: true, createdAt: true, updatedAt: true }
    });

    return res.status(201).json({ ok: true, data: nuevo });
  } catch (err) {
    console.error("Error creando usuario:", err);
    return res.status(500).json({ ok: false, error: "Error creando usuario" });
  }
});

module.exports = router;
