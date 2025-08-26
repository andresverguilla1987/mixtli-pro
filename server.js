require('dotenv').config();
const express = require('express');
const morgan = require('morgan');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors());
app.use(express.json({ limit: process.env.JSON_LIMIT || '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Health
app.get('/salud', (_req, res) => {
  res.json({ ok: true, mensaje: 'Mixtli OK' });
});

// Debug S3 (no imprime secretos)
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

// Rutas
app.use('/api/users', require('./src/rutas/users'));
app.use('/api', require('./src/rutas/upload'));

// Seed opcional al arrancar
if (process.env.SEED_ON_START === '1') {
  (async () => {
    try {
      await require('./prisma/seed').run();
      console.log('[SEED] Listo');
    } catch (e) {
      console.error('[SEED] Error:', e);
    }
  })();
}

// Error handler JSON
app.use((err, req, res, next) => {
  console.error('❌ Error handler:', err);
  res.status(err.status || 500).json({ error: err.message || 'Error interno' });
});

app.listen(PORT, () => {
  console.log(`🚀 Mixtli API corriendo en puerto ${PORT}`);
});
