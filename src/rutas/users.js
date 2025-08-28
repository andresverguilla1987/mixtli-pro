const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function toIntId(param) {
  const n = Number(param);
  if (!Number.isInteger(n) || n <= 0) return null;
  return n;
}

router.get('/', async (req, res) => {
  try {
    const usuarios = await prisma.usuario.findMany({
      orderBy: { id: 'asc' },
      select: { id: true, email: true, createdAt: true, updatedAt: true }
    });
    res.json({ ok: true, total: usuarios.length, data: usuarios });
  } catch (err) {
    console.error('Error listando usuarios:', err);
    res.status(500).json({ ok: false, error: 'Error interno al listar usuarios' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { email, password, passwordHash } = req.body || {};
    if (!email) return res.status(400).json({ ok: false, error: 'El campo email es obligatorio' });
    let hash = passwordHash;
    if (!hash) {
      if (!password) return res.status(400).json({ ok: false, error: 'Falta password (o passwordHash)' });
      hash = await bcrypt.hash(password, 10);
    }

    const nuevo = await prisma.usuario.create({
      data: { email, passwordHash: hash },
      select: { id: true, email: true, createdAt: true, updatedAt: true }
    });

    res.status(201).json({ ok: true, data: nuevo });
  } catch (err) {
    if (err.code === 'P2002') {
      return res.status(409).json({ ok: false, error: 'El email ya existe' });
    }
    console.error('Error creando usuario:', err);
    res.status(500).json({ ok: false, error: 'Error interno al crear usuario' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const id = toIntId(req.params.id);
    if (!id) return res.status(400).json({ ok: false, error: 'ID inválido' });

    const { email, password, passwordHash } = req.body || {};
    const data = {};
    if (email) data.email = email;
    if (passwordHash) data.passwordHash = passwordHash;
    else if (password) data.passwordHash = await bcrypt.hash(password, 10);

    if (Object.keys(data).length === 0) {
      return res.status(400).json({ ok: false, error: 'No hay campos para actualizar' });
    }

    const actualizado = await prisma.usuario.update({
      where: { id },
      data,
      select: { id: true, email: true, createdAt: true, updatedAt: true }
    });

    res.json({ ok: true, data: actualizado });
  } catch (err) {
    if (err.code === 'P2025') {
      return res.status(404).json({ ok: false, error: 'Usuario no encontrado' });
    }
    if (err.code === 'P2002') {
      return res.status(409).json({ ok: false, error: 'El email ya existe' });
    }
    console.error('Error actualizando usuario:', err);
    res.status(500).json({ ok: false, error: 'Error interno al actualizar usuario' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const id = toIntId(req.params.id);
    if (!id) return res.status(400).json({ ok: false, error: 'ID inválido' });

    await prisma.usuario.delete({ where: { id } });
    res.json({ ok: true, message: 'Usuario eliminado' });
  } catch (err) {
    if (err.code === 'P2025') {
      return res.status(404).json({ ok: false, error: 'Usuario no encontrado' });
    }
    console.error('Error eliminando usuario:', err);
    res.status(500).json({ ok: false, error: 'Error interno al eliminar usuario' });
  }
});

module.exports = router;
