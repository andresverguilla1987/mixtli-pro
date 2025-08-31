// src/rutas/users.js (HOTFIX rutas con id numérico + validaciones claras)
const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const Joi = require('joi');
const bcrypt = require('bcryptjs');

// ===== Schemas =====
const userCreateSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required()
});

const userUpdateSchema = Joi.object({
  email: Joi.string().email().optional(),
  password: Joi.string().min(6).optional()
}).min(1);

// ===== Helpers =====
const parseId = (req) => {
  const raw = req.params.id ?? req.query.id ?? req.body?.id;
  const id = Number(raw);
  if (!raw) { const e = new Error('Falta id en la URL (usa /api/users/:id)'); e.status = 400; throw e; }
  if (Number.isNaN(id) || id <= 0) { const e = new Error('id inválido: debe ser numérico positivo'); e.status = 400; throw e; }
  return id;
};

// ===== Rutas =====

// Listar
router.get('/', async (req, res, next) => {
  try {
    const usuarios = await prisma.usuario.findMany({
      orderBy: { id: 'asc' },
      select: { id: true, email: true, createdAt: true, updatedAt: true },
    });
    const data = usuarios.map(u => ({
      id: u.id,
      correo: u.email,
      createdAt: u.createdAt,
      updatedAt: u.updatedAt,
    }));
    res.json(data);
  } catch (err) { next(err); }
});

// Obtener por id (solo numérico)
router.get('/:id(\d+)', async (req, res, next) => {
  try {
    const id = parseId(req);
    const u = await prisma.usuario.findUnique({
      where: { id },
      select: { id: true, email: true, createdAt: true, updatedAt: true },
    });
    if (!u) return res.status(404).json({ error: 'no encontrado' });
    res.json({ id: u.id, correo: u.email, createdAt: u.createdAt, updatedAt: u.updatedAt });
  } catch (err) { next(err); }
});

// Crear
router.post('/', async (req, res, next) => {
  try {
    const { error, value } = userCreateSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.message });
    const { email, password } = value;
    const hash = await bcrypt.hash(password, 10);
    const nuevo = await prisma.usuario.create({
      data: { email, passwordHash: hash },
      select: { id: true, email: true, createdAt: true, updatedAt: true },
    });
    res.status(201).json({ id: nuevo.id, correo: nuevo.email, createdAt: nuevo.createdAt, updatedAt: nuevo.updatedAt });
  } catch (err) {
    if (err.code === 'P2002') return res.status(409).json({ error: 'email ya existe' });
    next(err);
  }
});

// Actualizar por id (solo numérico)
router.put('/:id(\d+)', async (req, res, next) => {
  try {
    const id = parseId(req);
    const { error, value } = userUpdateSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.message });
    const data = {};
    if (value.email) data.email = value.email;
    if (value.password) data.passwordHash = await bcrypt.hash(value.password, 10);
    const updated = await prisma.usuario.update({
      where: { id },
      data,
      select: { id: true, email: true, createdAt: true, updatedAt: true },
    });
    res.json({ id: updated.id, correo: updated.email, createdAt: updated.createdAt, updatedAt: updated.updatedAt });
  } catch (err) { next(err); }
});

// Borrar por id (solo numérico)
router.delete('/:id(\d+)', async (req, res, next) => {
  try {
    const id = parseId(req);
    await prisma.usuario.delete({ where: { id } });
    res.status(204).end();
  } catch (err) { next(err); }
});

module.exports = router;
