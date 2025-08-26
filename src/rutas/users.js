// src/rutas/users.js
const { Router } = require('express');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();
const router = Router();

// GET /api/users
router.get('/', async (_req, res, next) => {
  try {
    const usuarios = await prisma.usuario.findMany({
      orderBy: { id: 'asc' },
      select: { id: true, name: true, email: true, createdAt: true, updatedAt: true }
    });
    res.json({ ok: true, data: usuarios });
  } catch (err) { next(err); }
});

// POST /api/users
// Body JSON: { "name": "Juan", "email": "juan@test.com", "password": "Secreta123" }
router.post('/', async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ ok:false, error: 'name, email y password son requeridos' });
    }
    const passwordHash = bcrypt.hashSync(password, 10);
    const nuevo = await prisma.usuario.create({
      data: { name, email, passwordHash },
      select: { id: true, name: true, email: true, createdAt: true, updatedAt: true }
    });
    res.status(201).json({ ok: true, data: nuevo });
  } catch (err) {
    if (err && err.code === 'P2002') {
      return res.status(409).json({ ok:false, error: 'email ya existe' });
    }
    next(err);
  }
});

// PUT /api/users/:id
router.put('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ ok:false, error: 'id inválido' });
    const { name, email, password } = req.body;
    const data = {};
    if (name) data.name = name;
    if (email) data.email = email;
    if (password) data.passwordHash = bcrypt.hashSync(password, 10);

    const actualizado = await prisma.usuario.update({
      where: { id },
      data,
      select: { id: true, name: true, email: true, createdAt: true, updatedAt: true }
    });
    res.json({ ok: true, data: actualizado });
  } catch (err) {
    if (err && err.code === 'P2002') {
      return res.status(409).json({ ok:false, error: 'email ya existe' });
    }
    if (err && err.code === 'P2025') {
      return res.status(404).json({ ok:false, error: 'Usuario no encontrado' });
    }
    next(err);
  }
});

// DELETE /api/users/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ ok:false, error: 'id inválido' });
    const eliminado = await prisma.usuario.delete({
      where: { id },
      select: { id: true, name: true, email: true, createdAt: true, updatedAt: true }
    });
    res.json({ ok: true, data: eliminado });
  } catch (err) {
    if (err && err.code === 'P2025') {
      return res.status(404).json({ ok:false, error: 'Usuario no encontrado' });
    }
    next(err);
  }
});

module.exports = router;
