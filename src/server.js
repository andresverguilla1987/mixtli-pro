
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const authRoutes = require('./routes/auth');
const usersRoutes = require('./routes/users');

const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

app.get('/', (req, res) => {
  res.json({
    mensaje: '🌮 Bienvenido a la API de Mixtli',
    endpoints: {
      salud: '/salud',
      registro: '/api/auth/registro',
      login: '/api/auth/login',
      usuarios: '/api/users',
    }
  });
});

app.get('/salud', (req, res) => res.json({ ok: true }));

app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);

// 404
app.use((req, res) => {
  res.status(404).json({ error: 'No encontrado' });
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});
