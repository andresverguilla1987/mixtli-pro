require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');

const app = express();
app.use(cors());
app.use(express.json());

const prisma = new PrismaClient();

// Salud
app.get('/salud', (_req, res) => {
  res.json({ ok: true, status: 'ok', msg: 'Servidor arriba 🟢' });
});

// Debug S3 (no imprime secretos)
app.get('/debug/env-s3', (_req, res) => {
  res.json({
    ok: true,
    S3_REGION: process.env.S3_REGION || null,
    S3_BUCKET: process.env.S3_BUCKET || null,
    ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID ? "set" : "missing",
    SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY ? "set" : "missing",
    S3_ENDPOINT: process.env.S3_ENDPOINT ? "set" : "empty"
  });
});

// Rutas
app.use('/api/users', require('./src/rutas/users'));
app.use('/api', require('./src/rutas/upload'));

// Error handler JSON
app.use((err, _req, res, _next) => {
  console.error('❌ Error handler:', err);
  res.status(err.status || 500).json({ ok:false, error: err.message || 'Error' });
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Mixtli API en puerto ${PORT}`));
