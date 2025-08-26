
require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json({ limit: '5mb' }));

// Salud
app.get('/salud', (_req,res) => res.json({ ok: true, msg: 'Mixtli ok' }));

// Debug env S3 (sin secretos)
app.get("/debug/env-s3", (_req, res) => {
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

// 404 root
app.get('/', (_req,res)=> res.status(404).json({ ok:false, msg:'Use /salud, /api/users, /api/upload' }));

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`🚀 Mixtli API corriendo en puerto ${PORT}`);
});
