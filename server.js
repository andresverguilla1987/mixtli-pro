// server.js — Investor build (serve static + API)
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 10000;

// Seguridad y CORS
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : '*',
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 👉 Servir la landing pro desde /public
app.use(express.static('public'));

// Endpoints simples
app.get('/salud', (req, res) => res.json({ ok: true }));
app.get('/', (req, res) => {
  // Si no encuentra index.html por alguna razón, responde JSON
  res.send({ name: 'Mixtli API', ok: true, docs: '/api/users' });
});

// Rutas API
app.use('/api/users', require('./src/rutas/users'));
try {
  app.use('/api/uploads', require('./src/rutas/uploads'));
} catch(e) {
  // Si no existe la ruta de uploads en tu repo, ignora
  console.warn('uploads route no disponible (ok para demo)');
}

// Error handler global
app.use((err, req, res, next) => {
  console.error('Error global:', err);
  const status = err.status || 500;
  res.status(status).json({ error: err.message || 'Error inesperado' });
});

app.listen(PORT, () => {
  console.log(`🚀 API en puerto ${PORT}`);
});
