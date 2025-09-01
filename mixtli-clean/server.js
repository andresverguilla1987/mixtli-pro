// server.js (CommonJS)
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const app = express();

const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';
app.use(cors({ origin: CORS_ORIGIN }));
app.use(express.json({ limit: '50mb' }));
app.use(morgan('tiny'));

// health
app.get('/salud', (_req, res) => res.json({ ok: true, at: new Date().toISOString() }));

// static public
app.use(express.static('public'));

// routes
app.use('/api/users', require('./src/rutas/users'));
app.use('/api/uploads', require('./src/rutas/uploads'));

// 404
app.use((req, res) => res.status(404).json({ error: 'Ruta no encontrada', path: req.path }));

// error handler
app.use((err, _req, res, _next) => {
  console.error('Error global:', err);
  res.status(err.status || 500).json({ error: err.message || 'Error interno' });
});

const PORT = Number(process.env.PORT || 10000);
app.listen(PORT, () => console.log(`🚀 API en puerto ${PORT}`));
