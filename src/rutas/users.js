// src/rutas/users.js
const { Router } = require('express');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();
const router = Router();

// GET /api/users
router.get('/', async (_req, res) => {
  try {
    const usuarios = await prisma.usuario.findMany({
      orderBy: { id: 'asc' },
      select: { id: true, email: true, createdAt: true, updatedAt: true } // NO pedimos "nombre"
    });
    res.json({ ok: true, data: usuarios });
  } catch (err) {
    console.error('Error listando usuarios:', err);
    res.status(500).json({ error: 'Error listando usuarios' });
  }
});

// POST /api/users
// Body JSON (acepta cualquiera de los dos): 
//   { "email": "demo@x.com", "password": "123456" }
//   { "correoElectronico": "demo@x.com", "password": "123456" }
router.post('/', async (req, res) => {
  try {
    const email = (req.body.email || req.body.correoElectronico || '').trim();
    const password = (req.body.password || '').toString();

    if (!email || !password) {
      return res.status(400).json({ error: 'email/correoElectronico y password son requeridos' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'password debe tener al menos 6 caracteres' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const nuevo = await prisma.usuario.create({
      data: { email, passwordHash },
      select: { id: true, email: true, createdAt: true, updatedAt: true }
    });

    res.status(201).json({ ok: true, data: nuevo });
  } catch (err) {
    console.error('Error creando usuario:', err);
    // Conflicto por email único
    if (err && err.code === 'P2002') {
      return res.status(409).json({ error: 'email ya existe' });
    }
    return res.status(500).json({ error: 'Error creando usuario' });
  }
});

module.exports = router;
