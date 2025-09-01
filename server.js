// server.js (CommonJS, drop-in)
const express = require('express');
const cors = require('cors');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

// Rutas
const uploadsRouter = require('./src/rutas/uploads');

const app = express();
const prisma = new PrismaClient();

app.use(cors());
app.use(express.json());

// Healthcheck
app.get('/salud', (_req, res) => {
  res.json({ ok: true, msg: 'API funcionando chingón 🚀' });
});

// ===== Users CRUD =====

// Crear usuario
app.post('/api/users', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: 'email y password requeridos' });
    const user = await prisma.usuario.create({
      data: { email, passwordHash: password }
    });
    return res.status(201).json(user);
  } catch (err) {
    console.error('POST /api/users error:', err);
    const msg = String(err?.message || '');
    if (/Unique constraint/i.test(msg)) return res.status(409).json({ error: 'Email duplicado' });
    return res.status(400).json({ error: msg });
  }
});

// Listar usuarios
app.get('/api/users', async (_req, res) => {
  try {
    const users = await prisma.usuario.findMany({ orderBy: { id: 'asc' } });
    return res.json(users);
  } catch (err) {
    console.error('GET /api/users error:', err);
    return res.status(500).json({ error: String(err?.message || err) });
  }
});

// Obtener por id
app.get('/api/users/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ error: 'id inválido' });
    const user = await prisma.usuario.findUnique({ where: { id } });
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
    return res.json(user);
  } catch (err) {
    console.error('GET /api/users/:id error:', err);
    return res.status(500).json({ error: String(err?.message || err) });
  }
});

// Actualizar
app.put('/api/users/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ error: 'id inválido' });
    const data = {};
    if (req.body?.email) data.email = req.body.email;
    if (req.body?.password) data.passwordHash = req.body.password;
    if (!Object.keys(data).length) return res.status(400).json({ error: 'Nada que actualizar' });
    const updated = await prisma.usuario.update({ where: { id }, data });
    return res.json(updated);
  } catch (err) {
    console.error('PUT /api/users/:id error:', err);
    const msg = String(err?.message || '');
    if (/Record to update not found/i.test(msg)) return res.status(404).json({ error: 'Usuario no encontrado' });
    return res.status(400).json({ error: msg });
  }
});

// Borrar
app.delete('/api/users/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ error: 'id inválido' });
    await prisma.usuario.delete({ where: { id } });
    return res.status(204).send();
  } catch (err) {
    console.error('DELETE /api/users/:id error:', err);
    const msg = String(err?.message || '');
    if (/Record to delete does not exist|not found/i.test(msg)) return res.status(404).json({ error: 'Usuario no encontrado' });
    return res.status(400).json({ error: msg });
  }
});

// ===== Uploads (S3 multipart) =====
app.use('/api/uploads', uploadsRouter);

// Static demo (uploader)
app.use(express.static('public'));

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`🚀 API en puerto ${PORT}`);
});
