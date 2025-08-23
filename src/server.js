// src/server.js
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

app.get('/', (_req, res) => {
  res.json({
    mensaje: '✨ Bienvenido a la API de Mixtli',
    endpoints: { salud: '/salud', usuarios: '/api/users' }
  });
});

app.get('/salud', (_req, res) => {
  res.status(200).json({ status: 'ok', mensaje: 'Servidor funcionando 🟢' });
});

const usersRouter = require('./routes/users');
app.use('/api/users', usersRouter);

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Servidor corriendo en puerto ${PORT}`));
