const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const users = require('./src/rutas/users');

const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

app.get('/salud', (req, res) => res.json({ ok: true, msg: 'Mixtli API ok' }));
app.use(users);

// 404
app.use((req, res) => res.status(404).json({ ok: false, error: 'Ruta no encontrada' }));

app.listen(PORT, () => {
  console.log(`🚀 API en puerto ${PORT}`);
});