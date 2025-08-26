require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Salud
app.get('/salud', (_req, res) => res.json({ ok: true, mensaje: 'Servidor funcionando 🟢'}));

// Rutas
app.use('/api/users', require('./src/rutas/users'));
app.use('/api', require('./src/rutas/upload')); // POST /api/upload

// Debug env S3 (no imprime secretos)
app.get('/debug/env-s3', (_req, res) => {
  res.json({
    ok: true,
    S3_REGION: process.env.S3_REGION || null,
    S3_BUCKET: process.env.S3_BUCKET || null,
    ACCESS_KEY_ID: process.env.S3_ACCESS_KEY_ID ? "set" : "missing",
    SECRET_ACCESS_KEY: process.env.S3_SECRET_ACCESS_KEY ? "set" : "missing",
    S3_ENDPOINT: process.env.S3_ENDPOINT ? "set" : "empty"
  });
});

// Error handler JSON
app.use((err, _req, res, _next) => {
  console.error('❌ Error handler:', err);
  const status = err.status || 500;
  res.status(status).json({ ok: false, error: err.message || 'Error interno' });
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 Mixtli API corriendo en puerto ${PORT}`));
