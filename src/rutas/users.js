// src/rutas/users.js
const { Router } = require('express');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();
const router = Router();

// Helpers
const parseId = (raw) => {
  const n = Number(raw);
  if (!Number.isInteger(n) || n <= 0) return null;
  return n;
};

const userSelect = {
  id: true,
  name: true,
  email: true,
  createdAt: true,
  updatedAt: true,
};

// GET /api/users -> list
router.get('/', async (req, res) => {
  try {
    const { page = 1, pageSize = 50 } = req.query;
    const take = Math.min(Number(pageSize) || 50, 200);
    const skip = Math.max(((Number(page) || 1) - 1) * take, 0);

    const [items, total] = await Promise.all([
      prisma.usuario.findMany({
        orderBy: { id: 'asc' },
        select: userSelect,
        skip,
        take,
      }),
      prisma.usuario.count(),
    ]);

    res.json({ ok: true, data: items, meta: { total, page: Number(page) || 1, pageSize: take } });
  } catch (err) {
    console.error('Error listando usuarios:', err);
    res.status(500).json({ ok: false, error: 'Internal error listing users' });
  }
});

// GET /api/users/:id -> single
router.get('/:id', async (req, res) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ ok: false, error: 'Invalid id' });

    const user = await prisma.usuario.findUnique({ where: { id }, select: userSelect });
    if (!user) return res.status(404).json({ ok: false, error: 'User not found' });

    res.json({ ok: true, data: user });
  } catch (err) {
    console.error('Error obteniendo usuario:', err);
    res.status(500).json({ ok: false, error: 'Internal error fetching user' });
  }
});

// POST /api/users -> create
// Body JSON: { "name": "Juan", "email": "juan@test.com", "password": "123456" }
router.post('/', async (req, res) => {
  try {
    const { name, email, password } = req.body || {};
    if (!name || !email || !password) {
      return res.status(400).json({ ok: false, error: 'Name, email and password are required' });
    }

    const passwordHash = await bcrypt.hash(String(password), 10);

    const created = await prisma.usuario.create({
      data: { name, email, passwordHash },
      select: userSelect,
    });

    res.status(201).json({ ok: true, data: created });
  } catch (err) {
    console.error('Error creando usuario:', err);
    // Prisma duplicate key
    if (err && err.code === 'P2002') {
      return res.status(409).json({ ok: false, error: 'Email already exists' });
    }
    res.status(500).json({ ok: false, error: 'Internal error creating user' });
  }
});

// PUT /api/users/:id -> update (name, email, password)
router.put('/:id', async (req, res) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ ok: false, error: 'Invalid id' });

    const { name, email, password } = req.body || {};
    if (!name && !email && !password) {
      return res.status(400).json({ ok: false, error: 'Nothing to update' });
    }

    const data = {};
    if (name) data.name = name;
    if (email) data.email = email;
    if (password) data.passwordHash = await bcrypt.hash(String(password), 10);

    const updated = await prisma.usuario.update({
      where: { id },
      data,
      select: userSelect,
    });

    res.json({ ok: true, data: updated });
  } catch (err) {
    console.error('Error actualizando usuario:', err);
    if (err.code === 'P2025') {
      // record not found
      return res.status(404).json({ ok: false, error: 'User not found' });
    }
    if (err.code === 'P2002') {
      return res.status(409).json({ ok: false, error: 'Email already exists' });
    }
    res.status(500).json({ ok: false, error: 'Internal error updating user' });
  }
});

// DELETE /api/users/:id -> delete
router.delete('/:id', async (req, res) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ ok: false, error: 'Invalid id' });

    await prisma.usuario.delete({ where: { id } });
    res.status(204).send();
  } catch (err) {
    console.error('Error eliminando usuario:', err);
    if (err.code === 'P2025') {
      return res.status(404).json({ ok: false, error: 'User not found' });
    }
    res.status(500).json({ ok: false, error: 'Internal error deleting user' });
  }
});

module.exports = router;
