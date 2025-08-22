import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';

const app = express();
const prisma = new PrismaClient();

app.use(cors());
app.use(express.json());

// Health
app.get('/', (_req, res) => {
  res.json({ status: 'Servidor funcionando 🔥', version: '1.0.1' });
});

// Listar usuarios
app.get('/api/users', async (_req, res) => {
  try {
    const users = await prisma.user.findMany({ orderBy: { id: 'asc' } });
    res.json(users);
  } catch (err) {
    console.error('GET /api/users', err);
    res.status(500).json({ error: 'Error obteniendo usuarios' });
  }
});

// Crear usuario
app.post('/api/users', async (req, res) => {
  try {
    const { name, email, password } = req.body || {};
    if (!name || !email) return res.status(400).json({ error: 'name y email son requeridos' });

    const user = await prisma.user.create({ data: { name, email, password } });
    res.status(201).json(user);
  } catch (err) {
    console.error('POST /api/users', err);
    if (err.code === 'P2002') return res.status(409).json({ error: 'Email ya existe' });
    res.status(500).json({ error: 'Error creando usuario' });
  }
});

const PORT = process.env.PORT || 8080;

async function bootstrap() {
  try {
    await prisma.$connect();
    const count = await prisma.user.count();
    if (count === 0) {
      console.log("Base de datos vacía, ejecuta el seed manualmente con: npm run seed");
    }
    app.listen(PORT, () => {
      console.log(`API lista en puerto ${PORT}`);
    });
  } catch (e) {
    console.error('Error en bootstrap', e);
    process.exit(1);
  }
}

bootstrap();
