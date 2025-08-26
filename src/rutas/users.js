// src/rutas/users.js
const { Router } = require('express');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();
const router = Router();

/**
 * Helpers
 */
async function hashPassword(plain) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(plain, salt);
}

/**
 * GET /api/users
 * Lista usuarios (sin passwordHash)
 */
router.get('/', async (_req, res) => {
  try {
    const usuarios = await prisma.usuario.findMany({
      orderBy: { id: 'asc' },
      select: {
        id: true,
        email: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    res.json({ ok: true, data: usuarios });
  } catch (err) {
    console.error('Error listando usuarios:', err);
    res.status(500).json({ error: 'Error listando usuarios' });
  }
});

/**
 * GET /api/users/:id
 */
router.get('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'id inválido' });

    const user = await prisma.usuario.findUnique({
      where: { id },
      select: { id: true, email: true, createdAt: true, updatedAt: true },
    });
    if (!user) return res.status(404).json({ error: 'No encontrado' });

    res.json({ ok: true, data: user });
  } catch (err) {
    console.error('Error obteniendo usuario:', err);
    res.status(500).json({ error: 'Error obteniendo usuario' });
  }
});

/**
 * POST /api/users
 * body: { email, password }
 */
router.post('/', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: 'email y password son requeridos' });
    }

    const passwordHash = await hashPassword(password);

    const nuevo = await prisma.usuario.create({
      data: { email, passwordHash },
      select: { id: true, email: true, createdAt: true, updatedAt: true },
    });

    res.status(201).json({ ok: true, data: nuevo });
  } catch (err) {
    console.error('Error creando usuario:', err);
    // P2002: unique constraint failed
    if (err?.code === 'P2002') {
      return res.status(409).json({ error: 'email ya existe' });
    }
    res.status(500).json({ error: 'Error creando usuario' });
  }
});

/**
 * PUT /api/users/:id
 * body: { email?, password? }
 */
router.put('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'id inválido' });

    const data = {};
    if (req.body?.email) data.email = req.body.email;
    if (req.body?.password) data.passwordHash = await hashPassword(req.body.password);

    if (Object.keys(data).length === 0) {
      return res.status(400).json({ error: 'Nada que actualizar' });
    }

    const actualizado = await prisma.usuario.update({
      where: { id },
      data,
      select: { id: true, email: true, createdAt: true, updatedAt: true },
    });

    res.json({ ok: true, data: actualizado });
  } catch (err) {
    console.error('Error actualizando usuario:', err);
    if (err?.code === 'P2002') {
      return res.status(409).json({ error: 'email ya existe' });
    }
    if (err?.code === 'P2025') {
      return res.status(404).json({ error: 'No encontrado' });
    }
    res.status(500).json({ error: 'Error actualizando usuario' });
  }
});

/**
 * DELETE /api/users/:id
 */
router.delete('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'id inválido' });

    await prisma.usuario.delete({ where: { id } });
    res.json({ ok: true, message: 'Eliminado' });
  } catch (err) {
    console.error('Error eliminando usuario:', err);
    if (err?.code === 'P2025') {
      return res.status(404).json({ error: 'No encontrado' });
    }
    res.status(500).json({ error: 'Error eliminando usuario' });
  }
});

module.exports = router;
