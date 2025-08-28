const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { body, param, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');

const router = express.Router();
const prisma = new PrismaClient();

function assertValid(req) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const err = new Error('Solicitud inválida');
    err.status = 400;
    err.code = 'BAD_REQUEST';
    err.details = errors.array();
    throw err;
  }
}

// GET /api/users
router.get('/users', async (req, res, next) => {
  try {
    const skip = Number(req.query.skip || 0);
    const take = Number(req.query.take || 100);
    const users = await prisma.usuario.findMany({
      orderBy: { id: 'asc' },
      skip,
      take,
      select: {
        id: true,
        email: true,
        createdAt: true,
        updatedAt: true
      }
    });
    res.json({ ok: true, data: users });
  } catch (err) {
    next(err);
  }
});

// POST /api/users
router.post(
  '/users',
  [
    body('email').isEmail().withMessage('email inválido'),
    body('password').isString().isLength({ min: 6 }).withMessage('password mínimo 6 caracteres')
  ],
  async (req, res, next) => {
    try {
      assertValid(req);
      const { email, password } = req.body;
      const passwordHash = await bcrypt.hash(password, 10);

      const created = await prisma.usuario.create({
        data: { email, passwordHash },
        select: { id: true, email: true, createdAt: true, updatedAt: true }
      });

      res.status(201).json({ ok: true, data: created });
    } catch (err) {
      if (err.code === 'P2002') {
        err.status = 409;
        err.message = 'Email ya existe';
        err.code = 'DUPLICATE';
      }
      next(err);
    }
  }
);

// PUT /api/users/:id
router.put(
  '/users/:id',
  [
    param('id').isInt().withMessage('id debe ser entero'),
    body('email').optional().isEmail().withMessage('email inválido'),
    body('password').optional().isString().isLength({ min: 6 }).withMessage('password mínimo 6 caracteres')
  ],
  async (req, res, next) => {
    try {
      assertValid(req);
      const id = Number(req.params.id);
      const data = {};
      if (req.body.email) data.email = req.body.email;
      if (req.body.password) data.passwordHash = await bcrypt.hash(req.body.password, 10);

      const updated = await prisma.usuario.update({
        where: { id },
        data,
        select: { id: true, email: true, createdAt: true, updatedAt: true }
      });

      res.json({ ok: true, data: updated });
    } catch (err) {
      if (err.code === 'P2025') {
        err.status = 404;
        err.message = 'Usuario no encontrado';
        err.code = 'NOT_FOUND';
      }
      next(err);
    }
  }
);

// DELETE /api/users/:id
router.delete(
  '/users/:id',
  [param('id').isInt().withMessage('id debe ser entero')],
  async (req, res, next) => {
    try {
      assertValid(req);
      const id = Number(req.params.id);
      await prisma.usuario.delete({ where: { id } });
      res.json({ ok: true, message: 'Usuario eliminado' });
    } catch (err) {
      if (err.code === 'P2025') {
        err.status = 404;
        err.message = 'Usuario no encontrado';
        err.code = 'NOT_FOUND';
      }
      next(err);
    }
  }
);

module.exports = router;
