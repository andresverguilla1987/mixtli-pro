
require('dotenv').config();
const express = require('express');
const app = express();
const PORT = process.env.PORT || 10000;

app.use(express.json());

app.get('/salud', (req, res) => res.json({ ok: true }));

app.listen(PORT, () => console.log(`Servidor en puerto ${PORT}`));
