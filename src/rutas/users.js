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
      select: { id: true, email: true, createdAt: true, updatedAt: true },
    });
    res.json({ ok: true, data: usuarios });
  } catch (err) {
    console.error('Error listando usuarios:', err);
    res.status(500).json({ ok: false, error: 'Error listando usuarios' });
  }
});

// POST /api/users
router.post('/', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ ok: false, error: 'email y password son requeridos' });
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const nuevo = await prisma.usuario.create({
      data: { email, passwordHash },
      select: { id: true, email: true, createdAt: true, updatedAt: true },
    });
    res.status(201).json({ ok: true, data: nuevo });
  } catch (err) {
    console.error('Error creando usuario:', err);
    if (err?.code === 'P2002') {
      return res.status(409).json({ ok: false, error: 'email ya existe' });
    }
    res.status(500).json({ ok: false, error: 'Error creando usuario' });
  }
});

// PUT /api/users/:id
router.put('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { email, password } = req.body || {};
    if (!id) return res.status(400).json({ ok: false, error: 'id inválido' });

    const data = {};
    if (email) data.email = email;
    if (password) data.passwordHash = await bcrypt.hash(password, 10);
    if (!Object.keys(data).length) {
      return res.status(400).json({ ok: false, error: 'Nada para actualizar' });
    }

    const updated = await prisma.usuario.update({
      where: { id },
      data,
      select: { id: true, email: true, createdAt: true, updatedAt: true },
    });
    res.json({ ok: true, data: updated });
  } catch (err) {
    console.error('Error actualizando usuario:', err);
    if (err?.code === 'P2025') {
      return res.status(404).json({ ok: false, error: 'Usuario no encontrado' });
    }
    if (err?.code === 'P2002') {
      return res.status(409).json({ ok: false, error: 'email ya existe' });
    }
    res.status(500).json({ ok: false, error: 'Error actualizando usuario' });
  }
});

// DELETE /api/users/:id
router.delete('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ ok: false, error: 'id inválido' });

    await prisma.usuario.delete({ where: { id } });
    res.json({ ok: true });
  } catch (err) {
    console.error('Error eliminando usuario:', err);
    if (err?.code === 'P2025') {
      return res.status(404).json({ ok: false, error: 'Usuario no encontrado' });
    }
    res.status(500).json({ ok: false, error: 'Error eliminando usuario' });
  }
});

module.exports = router;
