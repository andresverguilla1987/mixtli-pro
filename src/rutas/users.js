const express = require('express');
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const router = express.Router();

// Listar usuarios
router.get('/', async (req, res, next) => {
  try {
    const usuarios = await prisma.usuario.findMany({
      orderBy: { id: 'asc' },
      select: { id: true, name: true, email: true, createdAt: true, updatedAt: true }
    });
    res.json(usuarios);
  } catch (err) {
    next(err);
  }
});

// Obtener usuario por ID
router.get('/:id', async (req, res, next) => {
  try {
    const usuario = await prisma.usuario.findUnique({
      where: { id: parseInt(req.params.id) },
      select: { id: true, name: true, email: true, createdAt: true, updatedAt: true }
    });
    if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json(usuario);
  } catch (err) {
    next(err);
  }
});

// Crear usuario
router.post('/',
  body('email').isEmail().withMessage('Email inválido'),
  body('password').isLength({ min: 6 }).withMessage('Mínimo 6 caracteres'),
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    try {
      const { name, email, password } = req.body;
      const passwordHash = await bcrypt.hash(password, 10);
      const nuevo = await prisma.usuario.create({
        data: { name, email, passwordHash },
        select: { id: true, name: true, email: true, createdAt: true, updatedAt: true }
      });
      res.status(201).json(nuevo);
    } catch (err) {
      next(err);
    }
  }
);

// Actualizar usuario
router.put('/:id',
  body('email').optional().isEmail().withMessage('Email inválido'),
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    try {
      const { name, email, password } = req.body;
      const data = {};
      if (name) data.name = name;
      if (email) data.email = email;
      if (password) data.passwordHash = await bcrypt.hash(password, 10);

      const actualizado = await prisma.usuario.update({
        where: { id: parseInt(req.params.id) },
        data,
        select: { id: true, name: true, email: true, createdAt: true, updatedAt: true }
      });
      res.json(actualizado);
    } catch (err) {
      next(err);
    }
  }
);

// Eliminar usuario
router.delete('/:id', async (req, res, next) => {
  try {
    await prisma.usuario.delete({
      where: { id: parseInt(req.params.id) }
    });
    res.json({ ok: true, mensaje: 'Usuario eliminado' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
