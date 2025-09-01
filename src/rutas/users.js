const express = require('express');
const { prisma } = require('../db');
const { authRequired } = require('../middlewares/auth');
const bcrypt = require('bcryptjs');

const router = express.Router();

router.post('/api/users', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: 'email y password requeridos' });
    const exists = await prisma.usuario.findUnique({ where: { email } });
    if (exists) return res.status(409).json({ error: 'email en uso' });
    const passwordHash = await bcrypt.hash(password, 10);
    const u = await prisma.usuario.create({ data: { email, passwordHash } });
    return res.status(201).json({ id: u.id, email: u.email, createdAt: u.createdAt });
  } catch (e) {
    console.error('POST /api/users', e);
    return res.status(500).json({ error: 'error' });
  }
});

router.get('/api/users', authRequired, async (req, res) => {
  try {
    const list = await prisma.usuario.findMany({
      orderBy: { id: 'asc' },
      select: { id: true, email: true, createdAt: true, updatedAt: true }
    });
    return res.json(list);
  } catch (e) {
    console.error('GET /api/users', e);
    return res.status(500).json({ error: 'error' });
  }
});

router.get('/api/users/:id', authRequired, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'id inválido' });
    const u = await prisma.usuario.findUnique({ where: { id }, select: { id: true, email: true, createdAt: true, updatedAt: true } });
    if (!u) return res.status(404).json({ error: 'no encontrado' });
    return res.json(u);
  } catch (e) {
    console.error('GET /api/users/:id', e);
    return res.status(500).json({ error: 'error' });
  }
});

router.put('/api/users/:id', authRequired, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { email } = req.body || {};
    if (!Number.isInteger(id) || id <= 0 || !email) return res.status(400).json({ error: 'id y email requeridos' });
    const u = await prisma.usuario.update({ where: { id }, data: { email }, select: { id: true, email: true, createdAt: true, updatedAt: true } });
    return res.json(u);
  } catch (e) {
    console.error('PUT /api/users/:id', e);
    if (e.code === 'P2025') return res.status(404).json({ error: 'no encontrado' });
    if (e.code === 'P2002') return res.status(409).json({ error: 'email en uso' });
    return res.status(500).json({ error: 'error' });
  }
});

router.delete('/api/users/:id', authRequired, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'id inválido' });
    await prisma.usuario.delete({ where: { id } });
    return res.json({ ok: true });
  } catch (e) {
    console.error('DELETE /api/users/:id', e);
    if (e.code === 'P2025') return res.status(404).json({ error: 'no encontrado' });
    return res.status(500).json({ error: 'error' });
  }
});

module.exports = router;
