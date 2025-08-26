// src/rutas/users.js
const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const bcrypt = require('bcryptjs');

// GET /api/users
router.get('/', async (req, res) => {
  try {
    const users = await prisma.usuario.findMany({
      orderBy: { id: 'asc' },
      select: { id: true, email: true, nombre: true, createdAt: true, updatedAt: true }
    });
    res.json(users);
  } catch (err) {
    console.error('Error listando usuarios:', err);
    res.status(500).json({ error: 'Error listando usuarios' });
  }
});

// POST /api/users
router.post('/', async (req, res) => {
  try {
    const { email, password, nombre } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: 'email y password son requeridos' });
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.usuario.create({
      data: { email, passwordHash, ...(nombre ? { nombre } : {}) },
      select: { id: true, email: true, nombre: true, createdAt: true, updatedAt: true }
    });
    res.status(201).json(user);
  } catch (err) {
    console.error('Error creando usuario:', err);
    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'email ya está registrado' });
    }
    res.status(500).json({ error: 'Error creando usuario' });
  }
});

// PUT /api/users/:id
router.put('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'id inválido' });

    const { email, password, nombre } = req.body || {};
    const data = {};
    if (email) data.email = email;
    if (typeof nombre !== 'undefined') data.nombre = nombre;
    if (password) data.passwordHash = await bcrypt.hash(password, 10);

    if (!Object.keys(data).length) {
      return res.status(400).json({ error: 'Nada para actualizar' });
    }

    const updated = await prisma.usuario.update({
      where: { id },
      data,
      select: { id: true, email: true, nombre: true, createdAt: true, updatedAt: true }
    });
    res.json(updated);
  } catch (err) {
    console.error('Error actualizando usuario:', err);
    res.status(500).json({ error: 'Error actualizando usuario' });
  }
});

// DELETE /api/users/:id
router.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'id inválido' });
    await prisma.usuario.delete({ where: { id } });
    res.json({ ok: true });
  } catch (err) {
    console.error('Error eliminando usuario:', err);
    res.status(500).json({ error: 'Error eliminando usuario' });
  }
});

module.exports = router;
