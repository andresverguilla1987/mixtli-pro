require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(cors({
  origin: process.env.CORS_ORIGIN || "*"
}));

// Rutas
app.use('/api/users', require('./src/rutas/users'));
app.use('/api/upload', require('./src/rutas/upload'));

app.get('/salud', (req, res) => res.json({ ok: true, msg: "API viva" }));

app.listen(PORT, () => console.log(`🚀 Mixtli API corriendo en puerto ${PORT}`));
