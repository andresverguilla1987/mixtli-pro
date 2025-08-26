require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();

// --- CORS ---
const origenes = (process.env.CORS_ORIGENES || '').split(',').map(s => s.trim()).filter(Boolean);
if (origenes.length === 0) {
  app.use(cors()); // permitir todo si no se define
} else {
  app.use(cors({
    origin: function (origin, cb) {
      if (!origin) return cb(null, true); // Postman / curl
      const ok = origenes.includes(origin);
      cb(ok ? null : new Error('Origen no permitido por CORS'), ok);
    },
    credentials: true
  }));
}

app.use(express.json());

// --- Salud ---
app.get('/salud', (_req, res) => {
  res.json({ ok: true, servicio: 'mixtli-api', timestamp: new Date().toISOString() });
});

// --- Rutas ---
const usersRouter = require('./src/rutas/users');
app.use('/api/users', usersRouter);

// --- Arranque ---
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`🚀 API lista en puerto ${PORT}`);
});
