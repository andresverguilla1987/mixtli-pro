const express = require('express');
const app = express();
const usersRoutes = require('./routes/users');

app.use(express.json());

app.get('/api/salud', (req, res) => {
  res.json({ ok: true, mensaje: 'API funcionando correctamente' });
});

app.use('/api/users', usersRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});
