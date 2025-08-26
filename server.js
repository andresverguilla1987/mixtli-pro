require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();

// Parse JSON
app.use(express.json());

// CORS allowed origins (comma-separated list in CORS_ORIGENES)
const allowed = (process.env.CORS_ORIGENES || '').split(',').map(s => s.trim()).filter(Boolean);
app.use(cors({
  origin: function(origin, cb) {
    if (!origin) return cb(null, true); // allow server-to-server / Postman
    if (allowed.length === 0 || allowed.includes(origin)) return cb(null, true);
    return cb(new Error('Bloqueado por CORS: ' + origin));
  }
}));

// Health
app.get('/salud', (_req, res) => {
  res.json({ ok: true, timestamp: new Date().toISOString() });
});

// Rutas
const usersRouter = require('./src/rutas/users');
app.use('/api/users', usersRouter);

// 404
app.use((_req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

// Error handler
app.use((err, _req, res, _next) => {
  console.error('❌ Error handler:', err);
  res.status(err.status || 500).json({ error: err.message || 'Error interno' });
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`🚀 Mixtli API corriendo en puerto ${PORT}`);
});
