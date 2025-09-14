import { Router } from 'express';
import { deleteMany } from '../utils/s3.js';

const router = Router();

router.post('/files/bulk', async (req, res) => {
  const { action, ids = [], targetAlbumId } = req.body || {};
  if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ error: 'ids required' });

  if (action === 'delete') {
    await deleteMany(process.env.R2_BUCKET, ids);
    return res.json({ ok: true, count: ids.length });
  }

  if ((action === 'move' || action === 'copy') && !targetAlbumId)
    return res.status(400).json({ error: 'targetAlbumId required' });

  // Without DB we no-op move/copy (keys unchanged)
  if (action === 'move' || action === 'copy') {
    return res.json({ ok: true, note: 'no-op without DB; implement key move if needed' });
  }

  res.status(400).json({ error: 'unknown action' });
});

export default router;
