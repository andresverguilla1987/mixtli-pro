// server.js
const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');

const app = express();
app.use(cors());
app.use(express.json());

const prisma = new PrismaClient();

// --- Salud / Home ---
app.get('/', (req, res) => {
  res.json({
    mensaje: '✨ Mixtli API',
    rutas: {
      salud: '/salud',
      debug: '/__debug',
      listarUsuarios: '/api/users',
      crearUsuario: '/api/users',
      actualizarUsuario: '/api/users/:id',
      eliminarUsuario: '/api/users/:id',
    },
  });
});

app.get('/salud', (_req, res) => {
  res.json({ status: 'ok', mensaje: 'Servidor funcionando 🟢' });
});

// --- NUEVO: endpoint de debug para evitar 404 ---
app.get('/__debug', (req, res) => {
  res.json({
    ok: true,
    now: new Date().toISOString(),
    uptimeSec: Math.round(process.uptime()),
    node: process.version,
    env: process.env.NODE_ENV || 'production',
    baseUrlEjemplo: 'https://mixtli-pro.onrender.com',
    rutas: [
      'GET /salud',
      'GET /__debug',
      'GET /api/users',
      'POST /api/users',
      'PUT /api/users/:id',
      'DELETE /api/users/:id',
    ],
  });
});

// --- Usuarios ---
app.get('/api/users', async (_req, res) => {
  const data = await prisma.usuario.findMany({ orderBy: { id: 'asc' } });
  res.json({ ok: true, data });
});

app.post('/api/users', async (req, res) => {
  try {
    const { nombre, email } = req.body;
    if (!nombre || !email) {
      return res.status(400).json({ error: 'nombre y email son requeridos' });
    }
    const nuevo = await prisma.usuario.create({ data: { nombre, email } });
    res.status(201).json({ ok: true, data: nuevo });
  } catch (e) {
    if (e.code === 'P2002') return res.status(409).json({ error: 'email ya existe' });
    console.error('Error creando usuario:', e);
    res.status(500).json({ error: 'Error creando usuario' });
  }
});

app.put('/api/users/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: 'id inválido' });
    const { nombre, email } = req.body;
    const actualizado = await prisma.usuario.update({
      where: { id },
      data: { ...(nombre && { nombre }), ...(email && { email }) },
    });
    res.json({ ok: true, data: actualizado });
  } catch (e) {
    if (e.code === 'P2002') return res.status(409).json({ error: 'email ya existe' });
    if (e.code === 'P2025') return res.status(404).json({ error: 'Usuario no encontrado' });
    console.error('Error actualizando usuario:', e);
    res.status(500).json({ error: 'Error actualizando usuario' });
  }
});

app.delete('/api/users/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: 'id inválido' });
    const eliminado = await prisma.usuario.delete({ where: { id } });
    res.json({ ok: true, data: eliminado });
  } catch (e) {
    if (e.code === 'P2025') return res.status(404).json({ error: 'Usuario no encontrado' });
    console.error('Error eliminando usuario:', e);
    res.status(500).json({ error: 'Error eliminando usuario' });
  }
});

// --- 404 JSON para cualquier ruta que no exista ---
app.use((req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada', path: req.method + ' ' + req.originalUrl });
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Servidor corriendo en puerto ${PORT}`));
