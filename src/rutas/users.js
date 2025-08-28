
// src/rutas/users.js
const { Router } = require('express');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();
const router = Router();

// GET: Lista de usuarios
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

// POST: Crear usuario
router.post('/', async (req, res) => {
  try {
    const { nombre, email, password } = req.body;
    if (!nombre || !email || !password) {
      return res.status(400).json({ error: 'nombre, email y password requeridos' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const nuevo = await prisma.usuario.create({
      data: { nombre, email, passwordHash },
      select: { id: true, nombre: true, email: true, createdAt: true, updatedAt: true }
    });

    res.status(201).json({ ok: true, data: nuevo });
  } catch (err) {
    console.error('Error creando usuario:', err);
    res.status(500).json({ error: 'Error creando usuario' });
  }
});

// PUT: Actualizar usuario
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, email, password } = req.body;
    const data = {};
    if (nombre) data.nombre = nombre;
    if (email) data.email = email;
    if (password) data.passwordHash = await bcrypt.hash(password, 10);

    const actualizado = await prisma.usuario.update({
      where: { id: parseInt(id) },
      data,
      select: { id: true, nombre: true, email: true, createdAt: true, updatedAt: true }
    });

    res.json({ ok: true, data: actualizado });
  } catch (err) {
    console.error('Error actualizando usuario:', err);
    res.status(500).json({ error: 'Error actualizando usuario' });
  }
});

// DELETE: Eliminar usuario
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.usuario.delete({ where: { id: parseInt(id) } });
    res.json({ ok: true, mensaje: 'Usuario eliminado' });
  } catch (err) {
    console.error('Error eliminando usuario:', err);
    res.status(500).json({ error: 'Error eliminando usuario' });
  }
});

module.exports = router;
