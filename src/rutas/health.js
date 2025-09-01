const express = require('express');
const router = express.Router();

router.get('/salud', (req, res) => {
  res.status(200).json({ ok: true, mensaje: 'Servidor vivo 🚀', ts: Date.now() });
});

module.exports = router;
