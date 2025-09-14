import { Router } from 'express';
import sharp from 'sharp';
import { getObjectBuffer, putObject } from '../utils/s3.js';

const router = Router();

router.post('/files/rename', async (req,res) => {
  const { id, newName } = req.body || {};
  if (!id || !newName) return res.status(400).json({ error: 'id and newName required' });
  // Without DB, we cannot rename metadata; keep as note
  return res.json({ ok: true, note: 'rename not persisted without DB' });
});

router.post('/files/transform', async (req,res) => {
  const { id, op, degrees = 90 } = req.body || {};
  if (!id || !op) return res.status(400).json({ error: 'id and op required' });
  if (op !== 'rotate') return res.status(400).json({ error: 'unsupported op' });

  const key = id;
  const buf = await getObjectBuffer(process.env.R2_BUCKET, key);
  const out = await sharp(buf).rotate(Number(degrees)).toBuffer();
  await putObject(process.env.R2_BUCKET, key, out, 'image/jpeg');
  return res.json({ ok: true });
});

export default router;
