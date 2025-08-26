require('dotenv').config();
const express = require('express');
const app = express();
const PORT = process.env.PORT || 10000;

app.use(express.json());

// Rutas
const userRoutes = require('./src/rutas/users');
app.use('/api/users', userRoutes);

app.get('/', (_req, res) => res.status(404).json({ ok: false, message: 'Not Found' }));

app.listen(PORT, () => {
  console.log(`🚀 Mixtli API corriendo en puerto ${PORT}`);
});
