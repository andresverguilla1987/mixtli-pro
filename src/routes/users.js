// src/rutas/users.js  (o src/routes/users.js si ese es tu path)
const { Router } = require("express");
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs"); // <= importa bcrypt

const prisma = new PrismaClient();
const router = Router();

// GET /api/users  -> sin exponer passwordHash
router.get("/", async (_req, res) => {
  try {
    const usuarios = await prisma.usuario.findMany({
      orderBy: { id: "asc" },
      select: { id: true, nombre: true, email: true, createdAt: true, updatedAt: true },
    });
    res.json({ ok: true, data: usuarios });
  } catch (err) {
    console.error("Error listando usuarios:", err);
    res.status(500).json({ ok: false, error: "Error listando usuarios" });
  }
});

// POST /api/users
// Body JSON: { "nombre": "Juan", "email": "juan@test.com", "password": "Mixtli123!" }
router.post("/", async (req, res) => {
  try {
    const { nombre, email, password } = req.body;

    if (!nombre || !email || !password) {
      return res.status(400).json({ ok: false, error: "nombre, email y password son requeridos" });
    }
    if (String(password).length < 8) {
      return res.status(400).json({ ok: false, error: "password debe tener al menos 8 caracteres" });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const nuevo = await prisma.usuario.create({
      data: { nombre, email, passwordHash },
      select: { id: true, nombre: true, email: true, createdAt: true, updatedAt: true }, // no regreses el hash
    });

    res.status(201).json({ ok: true, data: nuevo });
  } catch (err) {
    console.error("Error creando usuario:", err);
    // email único
    if (err && err.code === "P2002") {
      return res.status(409).json({ ok: false, error: "email ya existe" });
    }
    res.status(500).json({ ok: false, error: "Error creando usuario" });
  }
});

module.exports = router;
