require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();

// CORS
const originsEnv = process.env.CORS_ORIGINS || '';
const allowedOrigins = originsEnv
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
      return cb(null, true);
    }
    return cb(new Error('Not allowed by CORS'));
  },
  credentials: true
}));

app.use(express.json());

// healthcheck
app.get('/salud', (_req, res) => res.json({ ok: true }));

// routes
app.use('/api/users', require('./src/rutas/users'));

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`🚀 API en puerto ${PORT}`);
});
