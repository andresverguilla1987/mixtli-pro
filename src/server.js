// src/server.js
const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');

const app = express();
const prisma = new PrismaClient();

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.json({ status: 'Servidor funcionando 🔥', version: '1.0.0' });
});

app.get('/salud', (req, res) => {
  res.json({ ok: true, ts: new Date().toISOString() });
});

app.get('/api/users', async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, name: true, email: true, createdAt: true },
      orderBy: { createdAt: 'desc' }
    });
    res.json(users);
  } catch (err) {
    console.error('GET /api/users error:', err);
    res.status(500).json({ error: 'Error listando usuarios' });
  }
});

app.post('/api/users', async (req, res) => {
  try {
    const { name, email, password } = req.body || {};
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'name, email y password son obligatorios' });
    }
    const created = await prisma.user.create({
      data: { name, email, password }
    });
    res.status(201).json({ id: created.id, name: created.name, email: created.email });
  } catch (err) {
    console.error('POST /api/users error:', err);
    const msg = err?.meta?.target?.includes('email') ? 'Email ya registrado' : 'Error creando usuario';
    res.status(400).json({ error: msg });
  }
});

const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;
app.listen(PORT, () => {
  console.log(`API lista en puerto ${PORT}`);
});
