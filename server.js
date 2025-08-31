// server.js (HOTFIX combinado)
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 10000;

app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : '*',
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // soporta formularios además de JSON

// Root
app.get('/', (req, res) => {
  res.send({ name: 'Mixtli API', ok: true, docs: '/api/users' });
});

// Salud
app.get('/salud', (req, res) => {
  res.json({ ok: true });
});

// Rutas API
app.use('/api/users', require('./src/rutas/users'));
app.use('/api/uploads', require('./src/rutas/uploads'));

// Error handler
app.use((err, req, res, next) => {
  console.error('Error global:', err);
  const status = err.status || 500;
  res.status(status).json({ error: err.message || 'Error inesperado' });
});

app.listen(PORT, () => {
  console.log(`🚀 API en puerto ${PORT}`);
});
