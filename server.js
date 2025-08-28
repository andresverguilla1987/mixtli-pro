
// server.js
const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const app = express();
const prisma = new PrismaClient();

app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json());

// Rutas
app.use('/api/users', require('./src/rutas/users'));

// Health check
app.get('/salud', (req, res) => res.json({ ok: true, mensaje: "API viva ✅" }));

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 API en puerto ${PORT}`));
