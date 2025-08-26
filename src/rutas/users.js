// src/rutas/users.js
const { Router } = require('express');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();
const router = Router();

// Helper: mapea {nombre} -> {name} en la respuesta
const toPublicUser = (u) => ({
  id: u.id,
  name: u.nombre,        // <- el campo real en BD es 'nombre'
  email: u.email,
  createdAt: u.createdAt,
  updatedAt: u.updatedAt,
});

// GET /api/users  (lista)
router.get('/', async (_req, res) => {
  try {
    const usuarios = await prisma.usuario.findMany({
      orderBy: { id: 'asc' },
      select: { id: true, nombre: true, email: true, createdAt: true, updatedAt: true },
    });
    res.json({ ok: true, data: usuarios.map(toPublicUser) });
  } catch (err) {
    console.error('Error listando usuarios:', err);
    res.status(500).json({ error: 'Error listando usuarios' });
  }
});

// POST /api/users  (crea)
// Acepta body con { name, email, password } o { nombre, email, password }
router.post('/', async (req, res) => {
  try {
    const name = (req.body.name ?? req.body.nombre ?? '').trim();
    const email = (req.body.email ?? '').trim();
    const password = req.body.password ?? '';

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'name/email/password son requeridos' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const nuevo = await prisma.usuario.create({
      data: { nombre: name, email, passwordHash },
      select: { id: true, nombre: true, email: true, createdAt: true, updatedAt: true },
    });

    res.status(201).json({ ok: true, data: toPublicUser(nuevo) });
  } catch (err) {
    console.error('Error creando usuario:', err);
    if (err && err.code === 'P2002') {
      return res.status(409).json({ error: 'email ya existe' });
    }
    res.status(500).json({ error: 'Error creando usuario' });
  }
});

// PUT /api/users/:id  (actualiza opcionalmente name/email/password)
router.put('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ error: 'id inválido' });

    const data = {};
    if (typeof req.body.name === 'string' || typeof req.body.nombre === 'string') {
      data.nombre = (req.body.name ?? req.body.nombre).trim();
    }
    if (typeof req.body.email === 'string') {
      data.email = req.body.email.trim();
    }
    if (typeof req.body.password === 'string' && req.body.password.length > 0) {
      data.passwordHash = await bcrypt.hash(req.body.password, 10);
    }

    if (Object.keys(data).length === 0) {
      return res.status(400).json({ error: 'Nada para actualizar' });
    }

    const actualizado = await prisma.usuario.update({
      where: { id },
      data,
      select: { id: true, nombre: true, email: true, createdAt: true, updatedAt: true },
    });

    res.json({ ok: true, data: toPublicUser(actualizado) });
  } catch (err) {
    console.error('Error actualizando usuario:', err);
    if (err && err.code === 'P2025') {
      return res.status(404).json({ error: 'Usuario no encontrado' });
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
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    res.status(500).json({ error: 'Error borrando usuario' });
  }
});

module.exports = router;
