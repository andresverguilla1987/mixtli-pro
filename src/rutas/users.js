// src/rutas/users.js
const { Router } = require('express');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();
const router = Router();

router.get('/', async (_req, res) => {
  try {
    const usuarios = await prisma.usuario.findMany({
      orderBy: { id: 'asc' },
      select: { id: true, nombre: true, email: true, createdAt: true, updatedAt: true }
    });
    res.json({ ok: true, data: usuarios });
  } catch (err) {
    console.error('Error listando usuarios:', err);
    res.status(500).json({ error: 'Error listando usuarios' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { nombre, email, password } = req.body;
    if (!nombre || !email) {
      return res.status(400).json({ error: 'nombre y email son requeridos' });
    }
    const passwordHash = bcrypt.hashSync(password || 'demo1234', 10);
    const nuevo = await prisma.usuario.create({
      data: { nombre, email, passwordHash },
      select: { id: true, nombre: true, email: true, createdAt: true, updatedAt: true }
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

router.put('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { nombre, email } = req.body;
    if (!Number.isInteger(id)) return res.status(400).json({ error: 'id inválido' });
    const actualizado = await prisma.usuario.update({
      where: { id },
      data: { ...(nombre ? { nombre } : {}), ...(email ? { email } : {}) },
      select: { id: true, nombre: true, email: true, createdAt: true, updatedAt: true }
    });
    res.json({ ok: true, data: actualizado });
  } catch (err) {
    console.error('Error actualizando usuario:', err);
    if (err && err.code === 'P2025') return res.status(404).json({ error: 'usuario no encontrado' });
    res.status(500).json({ error: 'Error actualizando usuario' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isInteger(id)) return res.status(400).json({ error: 'id inválido' });
    await prisma.usuario.delete({ where: { id } });
    res.json({ ok: true, message: 'usuario eliminado' });
  } catch (err) {
    console.error('Error eliminando usuario:', err);
    if (err && err.code === 'P2025') return res.status(404).json({ error: 'usuario no encontrado' });
    res.status(500).json({ error: 'Error eliminando usuario' });
  }
});

module.exports = router;
