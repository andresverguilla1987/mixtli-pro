
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
      select: { id: true, name: true, email: true, createdAt: true, updatedAt: true }
    });
    res.json({ ok: true, data: usuarios });
  } catch (err) {
    console.error('Error listando usuarios:', err);
    res.status(500).json({ error: 'Error listando usuarios' });
  }
});

// POST /api/users
// Body JSON: { "name": "Juan", "email": "juan@test.com", "password": "opcional" }
router.post('/', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email) {
      return res.status(400).json({ error: 'name y email son requeridos' });
    }

    let passwordHash = undefined;
    if (password) {
      const salt = bcrypt.genSaltSync(10);
      passwordHash = bcrypt.hashSync(password, salt);
    }

    const nuevo = await prisma.usuario.create({
      data: { name, email, passwordHash },
      select: { id: true, name: true, email: true, createdAt: true, updatedAt: true }
    });

    res.status(201).json({ ok: true, data: nuevo });
  } catch (err) {
    console.error('Error creando usuario:', err);
    if (err && err.code === 'P2002') {
      return res.status(409).json({ error: 'email ya existe' });
    }
    res.status(500).json({ error: 'Error creando usuario' });
  }
});

// PUT /api/users/:id  Body: { name?, email?, password? }
router.put('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'id inválido' });

    const data = {};
    if (req.body.name) data.name = req.body.name;
    if (req.body.email) data.email = req.body.email;
    if (req.body.password) {
      const salt = bcrypt.genSaltSync(10);
      data.passwordHash = bcrypt.hashSync(req.body.password, salt);
    }

    const upd = await prisma.usuario.update({
      where: { id },
      data,
      select: { id: true, name: true, email: true, createdAt: true, updatedAt: true }
    });

    res.json({ ok: true, data: upd });
  } catch (err) {
    console.error('Error actualizando usuario:', err);
    res.status(500).json({ error: 'Error actualizando usuario' });
  }
});

// DELETE /api/users/:id
router.delete('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'id inválido' });

    await prisma.usuario.delete({ where: { id } });
    res.json({ ok: true });
  } catch (err) {
    console.error('Error eliminando usuario:', err);
    res.status(500).json({ error: 'Error eliminando usuario' });
  }
});

module.exports = router;
