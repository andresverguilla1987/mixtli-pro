const { Router } = require('express');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();
const router = Router();

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

router.post('/', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'name, email y password son requeridos' });
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const nuevo = await prisma.usuario.create({
      data: { name, email, passwordHash },
      select: { id: true, name: true, email: true, createdAt: true, updatedAt: true }
    });
    res.status(201).json({ ok: true, data: nuevo });
  } catch (err) {
    console.error('Error creando usuario:', err);
    if (err?.code === 'P2002') return res.status(409).json({ error: 'email ya existe' });
    res.status(500).json({ error: 'Error creando usuario' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { name, email, password } = req.body;
    const data = {};
    if (name) data.name = name;
    if (email) data.email = email;
    if (password) data.passwordHash = await bcrypt.hash(password, 10);

    const actualizado = await prisma.usuario.update({
      where: { id },
      data,
      select: { id: true, name: true, email: true, createdAt: true, updatedAt: true }
    });
    res.json({ ok: true, data: actualizado });
  } catch (err) {
    if (err?.code === 'P2002') return res.status(409).json({ error: 'email ya existe' });
    if (err?.code === 'P2025') return res.status(404).json({ error: 'Usuario no encontrado' });
    res.status(500).json({ error: 'Error actualizando usuario' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const eliminado = await prisma.usuario.delete({
      where: { id },
      select: { id: true, name: true, email: true, createdAt: true, updatedAt: true }
    });
    res.json({ ok: true, data: eliminado });
  } catch (err) {
    if (err?.code === 'P2025') return res.status(404).json({ error: 'Usuario no encontrado' });
    res.status(500).json({ error: 'Error eliminando usuario' });
  }
});

module.exports = router;
