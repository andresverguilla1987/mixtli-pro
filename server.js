// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();

const allowed = (process.env.CORS_ORIGIN || '*')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowed.includes('*') || allowed.includes(origin)) return cb(null, true);
    return cb(new Error('Not allowed by CORS: ' + origin));
  },
  credentials: true
}));

app.use(express.json());

app.get('/salud', (_req, res) => res.json({ ok: true, msg: 'API OK' }));

app.use('/api/users', require('./src/rutas/users'));

app.use((_req, res) => res.status(404).json({ error: 'Ruta no encontrada' }));

app.use((err, _req, res, _next) => {
  console.error('❌ Error handler:', err);
  res.status(500).json({ error: 'Error inesperado' });
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 API en puerto ${PORT}`));
