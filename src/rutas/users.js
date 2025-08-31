const express = require('express');
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const router = express.Router();

// Crear usuario
router.post('/',
  body('nombre').notEmpty(),
  body('correo_electronico').isEmail(),
  body('contrasena').isLength({ min: 6 }),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { nombre, correo_electronico, contrasena } = req.body;

      const hashedPassword = await bcrypt.hash(contrasena, 10);

      const user = await prisma.usuario.create({
        data: {
          nombre,
          email: correo_electronico,
          passwordHash: hashedPassword
        },
        select: { id: true, nombre: true, email: true, createdAt: true, updatedAt: true }
      });

      res.json(user);
    } catch (error) {
      console.error('Error creando usuario:', error);
      res.status(500).json({ error: 'Error interno al crear usuario' });
    }
  }
);

// Listar usuarios
router.get('/', async (req, res) => {
  try {
    const users = await prisma.usuario.findMany({
      orderBy: { id: 'asc' },
      select: { id: true, nombre: true, email: true, createdAt: true, updatedAt: true }
    });
    res.json(users);
  } catch (error) {
    console.error('Error listando usuarios:', error);
    res.status(500).json({ error: 'Error interno al listar usuarios' });
  }
});

// Obtener usuario por ID
router.get('/:id', async (req, res) => {
  try {
    const user = await prisma.usuario.findUnique({
      where: { id: parseInt(req.params.id) },
      select: { id: true, nombre: true, email: true, createdAt: true, updatedAt: true }
    });
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json(user);
  } catch (error) {
    console.error('Error obteniendo usuario:', error);
    res.status(500).json({ error: 'Error interno al obtener usuario' });
  }
});

// Actualizar usuario
router.put('/:id', async (req, res) => {
  try {
    const { nombre, correo_electronico, contrasena } = req.body;
    const data = {};

    if (nombre) data.nombre = nombre;
    if (correo_electronico) data.email = correo_electronico;
    if (contrasena) data.passwordHash = await bcrypt.hash(contrasena, 10);

    const updatedUser = await prisma.usuario.update({
      where: { id: parseInt(req.params.id) },
      data,
      select: { id: true, nombre: true, email: true, createdAt: true, updatedAt: true }
    });

    res.json(updatedUser);
  } catch (error) {
    console.error('Error actualizando usuario:', error);
    res.status(500).json({ error: 'Error interno al actualizar usuario' });
  }
});

// Eliminar usuario
router.delete('/:id', async (req, res) => {
  try {
    await prisma.usuario.delete({
      where: { id: parseInt(req.params.id) }
    });
    res.json({ ok: true, message: 'Usuario eliminado' });
  } catch (error) {
    console.error('Error eliminando usuario:', error);
    res.status(500).json({ error: 'Error interno al eliminar usuario' });
  }
});

module.exports = router;