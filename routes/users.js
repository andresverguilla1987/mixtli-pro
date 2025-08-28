const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// GET lista de usuarios
router.get('/', async (req, res) => {
  try {
    const usuarios = await prisma.usuario.findMany({
      select: { id: true, email: true, createdAt: true, updatedAt: true }
    });
    return res.json({ ok: true, datos: usuarios });
  } catch (err) {
    console.error('Error obteniendo usuarios:', err);
    return res.status(500).json({ ok: false, error: 'Error interno' });
  }
});

// GET usuario por ID
router.get('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ ok: false, error: 'id inválido' });
    }
    const user = await prisma.usuario.findUnique({
      where: { id },
      select: { id: true, email: true, createdAt: true, updatedAt: true }
    });
    if (!user) {
      return res.status(404).json({ ok: false, error: 'usuario no encontrado' });
    }
    return res.json({ ok: true, datos: user });
  } catch (err) {
    console.error('Error obteniendo usuario por ID:', err);
    return res.status(500).json({ ok: false, error: 'Error interno' });
  }
});

// POST crear usuario
router.post('/', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ ok: false, error: 'email y password requeridos' });
    }
    const nuevo = await prisma.usuario.create({
      data: { email, password }
    });
    return res.status(201).json({ ok: true, datos: nuevo });
  } catch (err) {
    console.error('Error creando usuario:', err);
    return res.status(500).json({ ok: false, error: 'Error interno' });
  }
});

// PUT actualizar usuario
router.put('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { email, password } = req.body;
    if (!email && !password) {
      return res.status(400).json({ ok: false, error: 'nada para actualizar (email/password)' });
    }
    const actualizado = await prisma.usuario.update({
      where: { id },
      data: { ...(email && { email }), ...(password && { password }) }
    });
    return res.json({ ok: true, datos: actualizado });
  } catch (err) {
    console.error('Error actualizando usuario:', err);
    return res.status(500).json({ ok: false, error: 'Error interno' });
  }
});

// DELETE eliminar usuario
router.delete('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    await prisma.usuario.delete({ where: { id } });
    return res.json({ ok: true, mensaje: 'usuario eliminado' });
  } catch (err) {
    console.error('Error eliminando usuario:', err);
    return res.status(500).json({ ok: false, error: 'Error interno' });
  }
});

module.exports = router;
