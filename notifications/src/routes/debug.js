import express from 'express';
import { getMailLog } from '../lib/drylog.js';
const router = express.Router();

router.get('/mail-log', (req, res) => {
  res.json({ items: getMailLog() });
});

export default router;
