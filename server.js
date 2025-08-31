const express = require('express');
const cors = require('cors');
const { Prisma } = require('@prisma/client');

const app = express();
const PORT = process.env.PORT || 10000;

app.use(express.json());

// Configuración de CORS
const corsOptions = {
  origin: (origin, callback) => {
    const allowed = (process.env.CORS_ORIGIN || '').split(',').map(o => o.trim());
    if (!origin || allowed.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('No permitido por CORS'));
    }
  }
};
app.use(cors(corsOptions));

// Rutas
const usersRouter = require('./src/rutas/users');
app.use('/api/users', usersRouter);

// Health check
app.get('/salud', (req, res) => {
  res.json({ ok: true, mensaje: 'API en funcionamiento' });
});

// Manejo global de errores
app.use((err, req, res, next) => {
  console.error('Error global:', err);
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'Email ya registrado' });
    }
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
  }
  res.status(500).json({ error: 'Error interno' });
});

app.listen(PORT, () => {
  console.log(`🚀 API en puerto ${PORT}`);
});
