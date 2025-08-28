const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
dotenv.config();

const app = express();
const PORT = process.env.PORT || 10000;

const origins = (process.env.CORS_ORIGINS || 'http://localhost:3000,https://web.postman.co')
  .split(',').map(o => o.trim()).filter(Boolean);

app.use(cors({
  origin: function (origin, cb) {
    if (!origin) return cb(null, true);
    if (origins.includes(origin)) return cb(null, true);
    return cb(null, true);
  },
  credentials: true
}));

app.use(express.json({ limit: '2mb' }));

app.get('/salud', (req, res) => {
  res.json({ ok: true, service: 'Mixtli API', time: new Date().toISOString() });
});

const usersRouter = require('./src/rutas/users');
app.use('/api/users', usersRouter);

app.use((req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada', path: req.originalUrl });
});

app.listen(PORT, () => {
  console.log(`🚀 API en puerto ${PORT}`);
});
