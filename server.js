require('dotenv').config();
const express = require('express');
const cors = require('cors');

const usersRouter = require('./src/rutas/users');
const uploadRouter = require('./src/rutas/upload'); // opcional

const app = express();
app.use(cors());
app.use(express.json());

app.get('/salud', (_req, res) => res.json({ ok: true, status: 'ok' }));

app.get('/debug/env-s3', (_req, res) => {
  res.json({
    ok: true,
    S3_REGION: process.env.S3_REGION || null,
    S3_BUCKET: process.env.S3_BUCKET || null,
    ACCESS_KEY_ID: process.env.S3_ACCESS_KEY_ID ? 'set' : 'missing',
    SECRET_ACCESS_KEY: process.env.S3_SECRET_ACCESS_KEY ? 'set' : 'missing',
    S3_ENDPOINT: process.env.S3_ENDPOINT ? 'set' : 'empty'
  });
});

app.use('/api/users', usersRouter);
if (uploadRouter) app.use('/api', uploadRouter);

app.use((err, _req, res, _next) => {
  console.error('❌ Error handler:', err);
  res.status(err.status || 500).json({ ok: false, error: err.message || 'Error interno' });
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Mixtli API en puerto ${PORT}`));
