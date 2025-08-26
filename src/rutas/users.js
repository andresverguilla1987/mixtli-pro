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
      select: { id: true, email: true, createdAt: true, updatedAt: true }
    });
    res.json(usuarios);
  } catch (err) {
    console.error('Error listando usuarios:', err);
    res.status(500).json({ error: 'Error listando usuarios' });
  }
});

// POST /api/users
// Body: { "email": "correo@dominio.com", "password": "TuPass123!" }
router.post('/', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'email y password son requeridos' });
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const nuevo = await prisma.usuario.create({
      data: { email, passwordHash },
      select: { id: true, email: true, createdAt: true, updatedAt: true }
    });
    res.status(201).json(nuevo);
  } catch (err) {
    console.error('Error creando usuario:', err);
    if (err && err.code === 'P2002') {
      return res.status(409).json({ error: 'email ya existe' });
    }
    res.status(500).json({ error: 'Error creando usuario' });
  }
});

// PUT /api/users/:id
// Body opcional: { "email": "...", "password": "..." }
router.put('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ error: 'id inválido' });

    const data = {};
    if (req.body.email) data.email = req.body.email;
    if (req.body.password) data.passwordHash = await bcrypt.hash(req.body.password, 10);
    if (Object.keys(data).length === 0) return res.status(400).json({ error: 'Nada para actualizar' });

    const actualizado = await prisma.usuario.update({
      where: { id },
      data,
      select: { id: true, email: true, createdAt: true, updatedAt: true }
    });
    res.json(actualizado);
  } catch (err) {
    console.error('Error actualizando usuario:', err);
    if (err && err.code === 'P2025') {
      return res.status(404).json({ error: 'usuario no encontrado' });
    }
    if (err && err.code === 'P2002') {
      return res.status(409).json({ error: 'email ya existe' });
    }
    res.status(500).json({ error: 'Error actualizando usuario' });
  }
});

// DELETE /api/users/:id
router.delete('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ error: 'id inválido' });

    await prisma.usuario.delete({ where: { id } });
    res.json({ ok: true });
  } catch (err) {
    console.error('Error borrando usuario:', err);
    if (err && err.code === 'P2025') {
      return res.status(404).json({ error: 'usuario no encontrado' });
    }
    res.status(500).json({ error: 'Error borrando usuario' });
  }
});

module.exports = router;
