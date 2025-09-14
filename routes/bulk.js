const express = require('express');
const router = express.Router();
const { deleteMany } = require('../utils/s3');

let prisma = null;
if (process.env.USE_PRISMA === 'true') {
  try { prisma = new (require('@prisma/client').PrismaClient)(); } catch {}
}

router.post('/files/bulk', async (req, res) => {
  const { action, ids = [], targetAlbumId } = req.body || {};
  if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ error: 'ids required' });

  if (action === 'delete') {
    if (prisma) {
      const files = await prisma.file.findMany({ where: { id: { in: ids } } });
      // borrar en R2 si tienes key; opcional (depende de tu flujo)
      const keys = files.map(f => f.key).filter(Boolean);
      if (keys.length) await deleteMany(process.env.R2_BUCKET, keys);
      await prisma.file.deleteMany({ where: { id: { in: ids } } });
      return res.json({ ok: true, count: ids.length });
    }
    // Fallback: sólo borrar en bucket por Key = id
    await deleteMany(process.env.R2_BUCKET, ids.map(id => ({ Key: id })).map(x => x.Key ? {Key: x.Key} : {Key: String(x)}));
    return res.json({ ok: true, count: ids.length });
  }

  if ((action === 'move' || action === 'copy') && !targetAlbumId)
    return res.status(400).json({ error: 'targetAlbumId required' });

  if (action === 'move') {
    if (prisma) {
      await prisma.file.updateMany({ where: { id: { in: ids } }, data: { albumId: targetAlbumId } });
      return res.json({ ok: true });
    }
    // Fallback: no-op (recomendado: cambiar Key con prefijo de álbum)
    return res.json({ ok: true, note: 'fallback mode: move is no-op without DB' });
  }

  if (action === 'copy') {
    if (prisma) {
      const originals = await prisma.file.findMany({ where: { id: { in: ids } } });
      const copies = originals.map(f => ({
        name: f.name, mimeType: f.mimeType, size: f.size, key: f.key, albumId: targetAlbumId
      }));
      if (copies.length) await prisma.file.createMany({ data: copies });
      return res.json({ ok: true, copied: copies.length });
    }
    return res.json({ ok: true, note: 'fallback mode: copy is no-op without DB' });
  }

  res.status(400).json({ error: 'unknown action' });
});

module.exports = router;
