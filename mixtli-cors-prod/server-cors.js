// server-cors.js
// Ejemplo de Express con CORS dinámico y Helmet endurecido para producción.

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const app = express();

// Parsear orígenes permitidos de env
const parseOrigins = (val) =>
  (val || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);

const allowed = parseOrigins(process.env.ALLOWED_ORIGINS);

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true); // Postman / curl
    if (allowed.includes(origin)) return callback(null, true);
    if (process.env.NODE_ENV !== 'production' && /^https?:\/\/(localhost|127\.0\.0\.1)(:\\d+)?$/.test(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Origen no permitido por CORS'));
  },
  credentials: true,
  methods: ['GET','POST','PUT','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization'],
  maxAge: 86400
};

app.use(cors(corsOptions));
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: false
}));

app.get('/salud', (req, res) => res.json({ ok: true, time: new Date().toISOString() }));

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 Server con CORS seguro en puerto ${PORT}`));
