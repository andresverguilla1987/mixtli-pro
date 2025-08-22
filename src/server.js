// src/server.js
const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 10000;

app.use(cors());
app.use(express.json());

// raíz bonita para que no salga "Cannot GET /"
app.get('/', (req, res) => {
  res.json({
    mensaje: '🚀 Bienvenido a la API de Mixtli',
    endpoints: {
      salud: '/salud',
      usuarios: '/api/users'
    }
  });
});

app.get('/salud', (_req, res) => {
  res.json({ ok: true, status: 'Servidor funcionando 🔥', version: '1.0.1' });
});

// Listar usuarios
app.get('/api/users', async (_req, res) => {
  try {
    const users = await prisma.user.findMany({ orderBy: { id: 'asc' } });
    res.json(users);
  } catch (err) {
    console.error('GET /api/users error:', err);
    res.status(500).json({ error: 'Error listando usuarios' });
  }
});

// Crear usuario
app.post('/api/users', async (req, res) => {
  try {
    const { name, email, password } = req.body || {};
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'name, email y password son obligatorios' });
    }
    const created = await prisma.user.create({ data: { name, email, password } });
    res.status(201).json(created);
  } catch (err) {
    console.error('POST /api/users error:', err);
    if (err?.code === 'P2002') return res.status(409).json({ error: 'Email ya existe' });
    res.status(500).json({ error: 'Error creando usuario' });
  }
});

app.listen(PORT, () => {
  console.log(`✅ API lista en puerto ${PORT}`);
});
