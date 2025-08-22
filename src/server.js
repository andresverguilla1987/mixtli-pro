
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

dotenv.config();
const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Ruta principal
app.get('/', (req, res) => {
  res.json({
    mensaje: "✨ Bienvenido a la API de Mixtli",
    endpoints: {
      salud: "/salud",
      usuarios: "/api/users"
    }
  });
});

// Ruta de salud
app.get('/salud', (req, res) => {
  res.json({ status: "ok", mensaje: "Servidor funcionando 🔥" });
});

// CRUD usuarios
app.get('/api/users', async (req, res) => {
  const users = await prisma.user.findMany();
  res.json(users);
});

app.post('/api/users', async (req, res) => {
  const { nombre, email, password } = req.body;
  try {
    const user = await prisma.user.create({ data: { nombre, email, password } });
    res.json(user);
  } catch (err) {
    res.status(400).json({ error: "No se pudo crear el usuario", detalle: err.message });
  }
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
});
