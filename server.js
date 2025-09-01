require('dotenv').config();
const express = require('express');
const cors = require('cors');

const health = require('./src/rutas/health');
const auth = require('./src/rutas/auth');
const users = require('./src/rutas/users');
const uploads = require('./src/rutas/uploads');

const app = express();
app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json({ limit: '50mb' }));

// Rutas
app.use(health);
app.use(auth);
app.use(users);
app.use(uploads);

// Root
app.get('/', (_, res) => res.status(200).send('<pre>Mixtli API up</pre>'));

// Error handler
app.use((err, req, res, next) => {
  console.error('Error global:', err);
  res.status(500).json({ error: 'error' });
});

const PORT = Number(process.env.PORT || 10000);
app.listen(PORT, () => {
  console.log('Usuarios: no encontrado (ok si no lo usas).');
  console.log(`🚀 API en puerto ${PORT}`);
});
