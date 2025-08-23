const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');

const app = express();
const prisma = new PrismaClient();

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.json({
    mensaje: "✨ Bienvenido a la API de Mixtli",
    endpoints: { salud: "/salud", usuarios: "/api/users" }
  });
});

app.get('/salud', (req, res) => {
  res.json({ status: "ok", mensaje: "Servidor funcionando 🔥" });
});

app.get('/api/users', async (req, res) => {
  try {
    const usuarios = await prisma.usuario.findMany({ orderBy: { id: 'asc' } });
    res.json(usuarios);
  } catch (err) {
    console.error('Error /api/users:', err);
    res.status(500).json({ error: 'Error listando usuarios' });
  }
});

app.post('/api/users', async (req, res) => {
  try {
    const { nombre, email } = req.body;
    if (!nombre || !email) return res.status(400).json({ error: 'nombre y email son requeridos' });
    const nuevo = await prisma.usuario.create({ data: { nombre, email } });
    res.status(201).json(nuevo);
  } catch (err) {
    console.error('Error POST /api/users:', err);
    if (err && err.code === 'P2002') return res.status(409).json({ error: 'email ya existe' });
    res.status(500).json({ error: 'Error creando usuario' });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Servidor corriendo en puerto ${PORT}`));
