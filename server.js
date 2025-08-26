// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();

const ORIGIN = process.env.CORS_ORIGIN || '*';
app.use(cors({ origin: ORIGIN === '*' ? true : ORIGIN.split(',') }));
app.use(express.json());

// Health
app.get('/salud', (req, res) => res.json({ ok: true, ts: Date.now() }));

// Users routes
app.use('/api/users', require('./src/rutas/users'));

// Root
app.get('/', (_req, res) => res.json({ name: 'Mixtli API', version: 'patch-users' }));

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 API en puerto ${PORT}`));
