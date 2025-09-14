const express = require('express');
const router = express.Router();
const sharp = require('sharp');
const { getObjectBuffer, putObject } = require('../utils/s3');

let prisma = null;
if (process.env.USE_PRISMA === 'true') {
  try { prisma = new (require('@prisma/client').PrismaClient)(); } catch {}
}

router.post('/files/rename', async (req, res) => {
  const { id, newName } = req.body || {};
  if (!id || !newName) return res.status(400).json({ error: 'id and newName required' });

  if (prisma) {
    const file = await prisma.file.update({ where: { id }, data: { name: newName } });
    return res.json({ ok: true, file });
  }
  // Fallback: no DB to rename meta
  return res.json({ ok: true, note: 'fallback mode: rename not persisted' });
});

router.post('/files/transform', async (req, res) => {
  const { id, op, degrees = 90 } = req.body || {};
  if (!id || !op) return res.status(400).json({ error: 'id and op required' });
  if (op !== 'rotate') return res.status(400).json({ error: 'unsupported op' });

  if (prisma) {
    const f = await prisma.file.findUnique({ where: { id } });
    if (!f) return res.status(404).json({ error: 'not found' });
    const buf = await getObjectBuffer(process.env.R2_BUCKET, f.key);
    const out = await sharp(buf).rotate(Number(degrees)).toBuffer();
    await putObject(process.env.R2_BUCKET, f.key, out, f.mimeType || 'image/jpeg');
    await prisma.file.update({ where: { id }, data: { updatedAt: new Date(), size: out.length } });
    return res.json({ ok: true });
  }
  // Fallback: interpret id as Key
  const key = id;
  const outMime = 'image/jpeg';
  const buf = await getObjectBuffer(process.env.R2_BUCKET, key);
  const out = await sharp(buf).rotate(Number(degrees)).toBuffer();
  await putObject(process.env.R2_BUCKET, key, out, outMime);
  return res.json({ ok: true });
});

module.exports = router;
