// src/rutas/users.js (patched)
// Corrige nombres de campos para el modelo Prisma:
// model Usuario { identificacion, CorreoElectronico, passwordHash, createdAt, actualizadoEn }

const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const bcrypt = require('bcryptjs');

// GET /api/users - lista usuarios
router.get('/', async (req, res) => {
  try {
    const users = await prisma.usuario.findMany({
      orderBy: { identificacion: 'asc' },
      select: {
        identificacion: true,
        CorreoElectronico: true,
        createdAt: true,
        actualizadoEn: true
      }
    });
    res.json({ ok: true, data: users });
  } catch (err) {
    console.error('Error listando usuarios:', err);
    res.status(500).json({ error: 'Internal error listing users' });
  }
});

// POST /api/users - crea usuario
router.post('/', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const created = await prisma.usuario.create({
      data: {
        CorreoElectronico: email,   // Mapea al campo real del schema
        passwordHash
      },
      select: {
        identificacion: true,
        CorreoElectronico: true,
        createdAt: true,
        actualizadoEn: true
      }
    });
    return res.status(201).json({ ok: true, data: created });
  } catch (err) {
    console.error('Error creando usuario:', err);
    // Prisma unique constraint
    if (err.code == 'P2002') {
      return res.status(409).json({ error: 'Email already exists' });
    }
    return res.status(500).json({ error: 'Error creating user' });
  }
});

// PUT /api/users/:id - actualiza usuario
router.put('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) {
      return res.status(400).json({ error: 'Invalid id' });
    }

    const updates = {};
    if (req.body?.email) updates.CorreoElectronico = req.body.email;
    if (req.body?.password) updates.passwordHash = await bcrypt.hash(req.body.password, 10);

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'Nothing to update' });
    }

    const updated = await prisma.usuario.update({
      where: { identificacion: id },
      data: updates,
      select: {
        identificacion: true,
        CorreoElectronico: true,
        createdAt: true,
        actualizadoEn: true
      }
    });

    return res.json({ ok: true, data: updated });
  } catch (err) {
    console.error('Error actualizando usuario:', err);
    if (err.code == 'P2025') {
      return res.status(404).json({ error: 'User not found' });
    }
    return res.status(500).json({ error: 'Error updating user' });
  }
});

// DELETE /api/users/:id - elimina usuario
router.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) {
      return res.status(400).json({ error: 'Invalid id' });
    }

    await prisma.usuario.delete({
      where: { identificacion: id }
    });

    return res.json({ ok: true });
  } catch (err) {
    console.error('Error eliminando usuario:', err);
    if (err.code == 'P2025') {
      return res.status(404).json({ error: 'User not found' });
    }
    return res.status(500).json({ error: 'Error deleting user' });
  }
});

module.exports = router;
