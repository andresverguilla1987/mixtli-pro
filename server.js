require('dotenv').config();
const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
const helmet = require('helmet');
const errorHandler = require('./src/middlewares/error');

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Bienvenida para evitar 404 en '/'
app.get('/', (req, res) => {
  res.send({
    name: 'Mixtli API (hotfix)',
    status: 'ok',
    docs: ['/salud','/api/users','/api/uploads/*'],
    time: new Date().toISOString(),
  });
});

app.get('/salud', (req, res) => res.json({ ok: true, time: new Date().toISOString() }));

// Rutas
app.use('/api/users', require('./src/rutas/users'));
app.use('/api/uploads', require('./src/rutas/uploads'));

// Error handler
app.use(errorHandler);

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 API en puerto ${PORT}`));
