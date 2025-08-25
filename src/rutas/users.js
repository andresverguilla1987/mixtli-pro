const express = require("express");
const bcrypt = require("bcryptjs");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const router = express.Router();

/**
 * POST /api/users
 * body: { nombre, email, password }
 */
router.post("/users", async (req, res) => {
  try {
    const { nombre, email, password } = req.body || {};

    if (!nombre || !email || !password) {
      return res.status(400).json({
        ok: false,
        error: "nombre, email y password son requeridos"
      });
    }

    // email único (opcional, pero recomendable)
    const existente = await prisma.usuario.findUnique({ where: { email } });
    if (existente) {
      return res.status(409).json({ ok: false, error: "Email ya registrado" });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const nuevo = await prisma.usuario.create({
      data: {
        nombre,
        email,
        passwordHash, // <- lo que pedía Prisma
      },
      select: { id: true, nombre: true, email: true, createdAt: true, updatedAt: true }
    });

    return res.status(201).json({ ok: true, data: nuevo });
  } catch (err) {
    console.error("❌ users.create:", err);
    return res.status(500).json({ ok: false, error: err.message });
  }
});

/**
 * GET /api/users
 * Lista sin exponer passwordHash
 */
router.get("/users", async (_req, res) => {
  try {
    const lista = await prisma.usuario.findMany({
      orderBy: { id: "desc" },
      select: { id: true, nombre: true, email: true, createdAt: true, updatedAt: true }
    });
    res.json({ ok: true, data: lista });
  } catch (err) {
    console.error("❌ users.list:", err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
