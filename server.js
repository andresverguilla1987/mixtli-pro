require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Rutas
const usersRouter = require('./src/rutas/users');
app.use('/api/users', usersRouter);

app.get('/salud', (req, res) => res.json({ ok: true, status: 'healthy' }));

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`🚀 Mixtli API corriendo en puerto ${PORT}`);
});
