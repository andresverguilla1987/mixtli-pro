const express = require('express');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors());
app.use(express.json());

// Rutas
app.use('/api/users', require('./src/rutas/users'));

app.get('/salud', (req, res) => {
  res.json({ ok: true, message: 'Servidor activo 🚀' });
});

app.listen(PORT, () => {
  console.log(`🚀 API en puerto ${PORT}`);
});