// src/rutas/users.js
const router = require('express').Router();
const { prisma } = require('../lib/prisma');
const bcrypt = require('bcryptjs');

// GET list
router.get('/', async (_req, res, next) => {
  try {
    const data = await prisma.usuario.findMany({
      orderBy: { id: 'asc' },
      select: { id: true, email: true, createdAt: true, updatedAt: true }
    });
    res.json(data);
  } catch (e) { next(e); }
});

// POST create
router.post('/', async (req, res, next) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: 'email y password requeridos' });
    const passwordHash = await bcrypt.hash(password, 10);
    const u = await prisma.usuario.create({
      data: { email, passwordHash },
      select: { id: true, email: true, createdAt: true, updatedAt: true }
    });
    res.status(201).json(u);
  } catch (e) {
    if (e.code === 'P2002') return res.status(409).json({ error: 'email ya existe' });
    next(e);
  }
});

// GET by id
router.get('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: 'id inválido' });
    const u = await prisma.usuario.findUnique({
      where: { id },
      select: { id: true, email: true, createdAt: true, updatedAt: true }
    });
    if (!u) return res.status(404).json({ error: 'no encontrado' });
    res.json(u);
  } catch (e) { next(e); }
});

// PUT update
router.put('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: 'id inválido' });
    const { email } = req.body || {};
    const u = await prisma.usuario.update({
      where: { id },
      data: { email: email || undefined },
      select: { id: true, email: true, createdAt: true, updatedAt: true }
    });
    res.json(u);
  } catch (e) { next(e); }
});

// DELETE
router.delete('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: 'id inválido' });
    await prisma.usuario.delete({ where: { id } });
    res.json({ ok: true });
  } catch (e) { next(e); }
});

module.exports = router;
