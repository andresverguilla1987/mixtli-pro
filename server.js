// server.js (referencia: solo úsalo si tu server.js es distinto)
require('dotenv').config();
const express = require('express');
const app = express();
const cors = require('cors');

app.use(cors());
app.use(express.json());

app.get('/salud', (_req, res) => res.json({ ok: true, msg: 'ok' }));

app.use('/api/users', require('./src/rutas/users'));

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 Mixtli API corriendo en puerto ${PORT}`));
