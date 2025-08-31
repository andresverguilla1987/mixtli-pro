const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { body, param, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();
const router = express.Router();

// Helper para manejo de errores uniformes
function handlePrismaError(err, res, contexto = 'Error global') {
  console.error(contexto + ':', err);
  if (err.code === 'P2002') {
    // unique constraint
    return res.status(409).json({ ok: false, error: 'El correo ya existe' });
  }
  if (err.code === 'P2025') {
    // not found
    return res.status(404).json({ ok: false, error: 'Usuario no encontrado' });
  }
  return res.status(500).json({ ok: false, error: 'Error interno' });
}

// GET lista
router.get('/api/users', async (req, res) => {
  try {
    const data = await prisma.usuario.findMany({
      orderBy: { id: 'asc' },
      select: { id: true, nombre: true, correo: true, createdAt: true, updatedAt: true }
    });
    res.json({ ok: true, data });
  } catch (err) {
    return handlePrismaError(err, res);
  }
});

// GET por id
router.get('/api/users/:id',
  param('id').isInt().toInt(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ ok: false, error: 'id inválido' });
    try {
      const user = await prisma.usuario.findUnique({
        where: { id: req.params.id },
        select: { id: true, nombre: true, correo: true, createdAt: true, updatedAt: true }
      });
      if (!user) return res.status(404).json({ ok: false, error: 'Usuario no encontrado' });
      res.json({ ok: true, data: user });
    } catch (err) {
      return handlePrismaError(err, res);
    }
  }
);

// POST crear
router.post('/api/users',
  body('nombre').isString().trim().isLength({ min: 1 }),
  body('correo').isString().trim().isEmail(),
  body('contrasena').isString().isLength({ min: 8 }),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ ok: false, error: 'Datos inválidos (nombre/correo/contrasena)' });
    const { nombre, correo, contrasena } = req.body;
    try {
      const passwordHash = await bcrypt.hash(contrasena, 10);
      const nuevo = await prisma.usuario.create({
        data: { nombre, correo, passwordHash },
        select: { id: true, nombre: true, correo: true, createdAt: true, updatedAt: true }
      });
      res.status(201).json({ ok: true, data: nuevo });
    } catch (err) {
      return handlePrismaError(err, res, 'Error creando usuario');
    }
  }
);

// PUT actualizar
router.put('/api/users/:id',
  param('id').isInt().toInt(),
  body('nombre').optional().isString().trim().isLength({ min: 1 }),
  body('correo').optional().isString().trim().isEmail(),
  body('contrasena').optional().isString().isLength({ min: 8 }),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ ok: false, error: 'Datos inválidos o id inválido' });
    const updates = {};
    if (req.body.nombre) updates.nombre = req.body.nombre;
    if (req.body.correo) updates.correo = req.body.correo;
    if (req.body.contrasena) updates.passwordHash = await bcrypt.hash(req.body.contrasena, 10);
    if (Object.keys(updates).length === 0) return res.status(400).json({ ok: false, error: 'Nada que actualizar' });
    try {
      const edited = await prisma.usuario.update({
        where: { id: req.params.id },
        data: updates,
        select: { id: true, nombre: true, correo: true, createdAt: true, updatedAt: true }
      });
      res.json({ ok: true, data: edited });
    } catch (err) {
      return handlePrismaError(err, res, 'Error actualizando usuario');
    }
  }
);

// DELETE eliminar
router.delete('/api/users/:id',
  param('id').isInt().toInt(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ ok: false, error: 'id inválido' });
    try {
      await prisma.usuario.delete({ where: { id: req.params.id } });
      res.json({ ok: true, data: { id: Number(req.params.id) } });
    } catch (err) {
      return handlePrismaError(err, res, 'Error eliminando usuario');
    }
  }
);

module.exports = router;