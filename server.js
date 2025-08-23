// src/server.js
// Mixtli API - Express + Prisma
// Actualiza: agrega rutas PUT /api/users/:id y DELETE /api/users/:id

const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');

const app = express();
const prisma = new PrismaClient();

app.use(cors());
app.use(express.json());

// Raíz
app.get('/', (req, res) => {
  res.json({
    mensaje: '✨ Bienvenido a la API de Mixtli',
    endpoints: {
      salud: '/salud',
      usuarios: '/api/users'
    }
  });
});

// Salud
app.get('/salud', (req, res) => {
  res.json({ status: 'ok', mensaje: 'Servidor funcionando 🟢' });
});

// Listar usuarios
app.get('/api/users', async (req, res) => {
  try {
    const data = await prisma.usuario.findMany({ orderBy: { id: 'asc' } });
    res.json({ ok: true, data });
  } catch (err) {
    console.error('Error /api/users:', err);
    res.status(500).json({ error: 'Error listando usuarios' });
  }
});

// Crear usuario
app.post('/api/users', async (req, res) => {
  try {
    const { nombre, email } = req.body;
    if (!nombre || !email) {
      return res.status(400).json({ error: 'nombre y email son requeridos' });
    }
    const existing = await prisma.usuario.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ error: 'email ya existe' });
    }
    const user = await prisma.usuario.create({ data: { nombre, email } });
    res.status(201).json({ ok: true, data: user });
  } catch (err) {
    console.error('Error creando usuario:', err);
    res.status(500).json({ error: 'Error creando usuario' });
  }
});

// 🔧 Actualizar usuario
app.put('/api/users/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { nombre, email } = req.body;
    if (!Number.isInteger(id)) return res.status(400).json({ error: 'id inválido' });

    // Si envía email, checa duplicado
    if (email) {
      const exists = await prisma.usuario.findUnique({ where: { email } });
      if (exists && exists.id !== id) {
        return res.status(409).json({ error: 'email ya existe' });
      }
    }

    const user = await prisma.usuario.update({
      where: { id },
      data: { ...(nombre && { nombre }), ...(email && { email }) }
    });
    res.json({ ok: true, data: user });
  } catch (err) {
    console.error('Error actualizando usuario:', err);
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    res.status(500).json({ error: 'Error actualizando usuario' });
  }
});

// 🗑️ Eliminar usuario
app.delete('/api/users/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isInteger(id)) return res.status(400).json({ error: 'id inválido' });

    await prisma.usuario.delete({ where: { id } });
    res.json({ ok: true, mensaje: 'Usuario eliminado' });
  } catch (err) {
    console.error('Error eliminando usuario:', err);
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    res.status(500).json({ error: 'Error eliminando usuario' });
  }
});

// Arranque (Render usa su propio comando de start; este bloque ayuda localmente)
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});

process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});
