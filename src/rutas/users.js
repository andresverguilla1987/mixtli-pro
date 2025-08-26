// src/rutas/users.js
const { Router } = require('express');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();
const router = Router();

// Normalizador de payload
function pickUserPayload(body) {
  const email = body.email || body.correo || body.correoElectronico;
  const password = body.password || body.clave;
  return { email, password };
}

// GET /api/users
router.get('/', async (_req, res) => {
  try {
    const usuarios = await prisma.usuario.findMany({
      orderBy: { id: 'asc' },
      select: { id: true, email: true, createdAt: true, updatedAt: true }
    });
    res.json({ ok: true, data: usuarios });
  } catch (err) {
    console.error('Error listando usuarios:', err);
    res.status(500).json({ ok: false, error: 'Error listando usuarios' });
  }
});

// POST /api/users
// Body JSON: { "email": "demo_{{timestamp}}@example.com", "password": "123456" }
router.post('/', async (req, res) => {
  try {
    const { email, password } = pickUserPayload(req.body);
    if (!email || !password) {
      return res.status(400).json({ ok: false, error: 'email y password son requeridos' });
    }
    const passwordHash = bcrypt.hashSync(password, 10);
    const nuevo = await prisma.usuario.create({
      data: { email, passwordHash },
      select: { id: true, email: true, createdAt: true, updatedAt: true }
    });
    res.status(201).json({ ok: true, data: nuevo });
  } catch (err) {
    console.error('Error creando usuario:', err);
    if (err && err.code === 'P2002') {
      return res.status(409).json({ ok: false, error: 'email ya existe' });
    }
    res.status(500).json({ ok: false, error: 'Error creando usuario' });
  }
});

// PUT /api/users/:id  (cambia email y/o password)
router.put('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ ok: false, error: 'id inválido' });
    const { email, password } = pickUserPayload(req.body);
    if (!email && !password) {
      return res.status(400).json({ ok: false, error: 'nada que actualizar (email/password)' });
    }
    const data = {};
    if (email) data.email = email;
    if (password) data.passwordHash = bcrypt.hashSync(password, 10);
    const actualizado = await prisma.usuario.update({
      where: { id },
      data,
      select: { id: true, email: true, createdAt: true, updatedAt: true }
    });
    res.json({ ok: true, data: actualizado });
  } catch (err) {
    console.error('Error actualizando usuario:', err);
    if (err && err.code === 'P2002') {
      return res.status(409).json({ ok: false, error: 'email ya existe' });
    }
    if (err && err.code === 'P2025') {
      return res.status(404).json({ ok: false, error: 'usuario no encontrado' });
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
    if (err && err.code === 'P2025') {
      return res.status(404).json({ ok: false, error: 'usuario no encontrado' });
    }
    res.status(500).json({ ok: false, error: 'Error eliminando usuario' });
  }
});

module.exports = router;
