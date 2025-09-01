const express = require('express');
const router = express.Router();
router.get('/salud', (req, res) => {
  res.status(200).json({ ok: true, ts: Date.now() });
});
module.exports = router;