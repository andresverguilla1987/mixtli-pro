// src/rutas/users.js
const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const bcrypt = require('bcryptjs');

// GET /api/users - list users
router.get('/', async (req, res) => {
  try {
    const usuarios = await prisma.usuario.findMany({
      orderBy: { id: 'asc' },
      select: {
        id: true,
        nombre: true,
        email: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    res.json(usuarios);
  } catch (err) {
    console.error('Error listando usuarios:', err);
    res.status(500).json({ error: 'Error listando usuarios' });
  }
});

// POST /api/users - create user
router.post('/', async (req, res) => {
  try {
    const { nombre, email, password } = req.body || {};
    if (!nombre || !email || !password) {
      return res.status(400).json({ error: 'name, email y password son requeridos' });
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const creado = await prisma.usuario.create({
      data: { nombre, email, passwordHash },
      select: { id: true, nombre: true, email: true, createdAt: true, updatedAt: true },
    });
    res.status(201).json(creado);
  } catch (err) {
    console.error('Error creando usuario:', err);
    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'email ya está registrado' });
    }
    res.status(500).json({ error: 'Error creando usuario' });
  }
});

// GET /api/users/:id - get by id
router.get('/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) return res.status(400).json({ error: 'id inválido' });
  try {
    const u = await prisma.usuario.findUnique({
      where: { id },
      select: { id: true, nombre: true, email: true, createdAt: true, updatedAt: true },
    });
    if (!u) return res.status(404).json({ error: 'usuario no encontrado' });
    res.json(u);
  } catch (err) {
    console.error('Error obteniendo usuario:', err);
    res.status(500).json({ error: 'Error obteniendo usuario' });
  }
});

// PUT /api/users/:id - update
router.put('/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) return res.status(400).json({ error: 'id inválido' });
  const { nombre, email, password } = req.body || {};
  if (!nombre && !email && !password) {
    return res.status(400).json({ error: 'Nada para actualizar' });
  }
  try {
    const data = {};
    if (nombre) data.nombre = nombre;
    if (email) data.email = email;
    if (password) data.passwordHash = await bcrypt.hash(password, 10);

    const actualizado = await prisma.usuario.update({
      where: { id },
      data,
      select: { id: true, nombre: true, email: true, createdAt: true, updatedAt: true },
    });
    res.json(actualizado);
  } catch (err) {
    console.error('Error actualizando usuario:', err);
    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'email ya está registrado' });
    }
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'usuario no encontrado' });
    }
    res.status(500).json({ error: 'Error actualizando usuario' });
  }
});

// DELETE /api/users/:id - delete
router.delete('/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) return res.status(400).json({ error: 'id inválido' });
  try {
    await prisma.usuario.delete({ where: { id } });
    res.json({ ok: true });
  } catch (err) {
    console.error('Error eliminando usuario:', err);
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'usuario no encontrado' });
    }
    res.status(500).json({ error: 'Error eliminando usuario' });
  }
});

module.exports = router;
