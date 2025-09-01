import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';

const app = express();
const prisma = new PrismaClient();

app.use(cors());
app.use(express.json());

// Endpoint de salud
app.get('/salud', (req, res) => {
  res.json({ status: 'ok', msg: 'API funcionando chingón 🚀' });
});

// =========================
// RUTAS DE USUARIOS CRUD
// =========================

// Crear usuario
app.post('/api/users', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await prisma.usuario.create({
      data: { email, passwordHash: password }
    });
    res.status(201).json(user);
  } catch (error) {
    console.error('Error creando usuario:', error);
    res.status(400).json({ error: error.message });
  }
});

// Listar todos los usuarios
app.get('/api/users', async (req, res) => {
  try {
    const users = await prisma.usuario.findMany({
      orderBy: { id: 'asc' }
    });
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Obtener usuario por ID
app.get('/api/users/:id', async (req, res) => {
  try {
    const user = await prisma.usuario.findUnique({
      where: { id: Number(req.params.id) }
    });
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Actualizar usuario
app.put('/api/users/:id', async (req, res) => {
  try {
    const updated = await prisma.usuario.update({
      where: { id: Number(req.params.id) },
      data: req.body
    });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Eliminar usuario
app.delete('/api/users/:id', async (req, res) => {
  try {
    await prisma.usuario.delete({
      where: { id: Number(req.params.id) }
    });
    res.json({ msg: 'Usuario eliminado correctamente' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// =========================
// INICIO DEL SERVIDOR
// =========================
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`🚀 API en puerto ${PORT}`);
});
