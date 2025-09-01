const express = require('express');
const { authRequired } = require('../middlewares/auth');
const { initMultipart, signPart, completeMultipart, abortMultipart, list, BUCKET } = require('../lib/s3');

const router = express.Router();
router.use('/public', express.static('public'));

router.post('/api/uploads/multipart/init', authRequired, async (req, res) => {
  try {
    const { key, contentType } = req.body || {};
    if (!key || !contentType) return res.status(400).json({ error: 'key y contentType requeridos' });
    const r = await initMultipart(key, contentType);
    return res.json({ bucket: BUCKET, key, uploadId: r.uploadId });
  } catch (e) {
    console.error('init multipart', e);
    return res.status(500).json({ error: 'init_failed' });
  }
});

router.get('/api/uploads/multipart/sign-part', authRequired, async (req, res) => {
  try {
    const { key, uploadId, partNumber } = req.query || {};
    if (!key || !uploadId || !partNumber) return res.status(400).json({ error: 'params' });
    const r = await signPart(key, uploadId, Number(partNumber));
    return res.json(r);
  } catch (e) {
    console.error('sign part', e);
    return res.status(500).json({ error: 'sign_failed' });
  }
});

router.post('/api/uploads/multipart/complete', authRequired, async (req, res) => {
  try {
    const { key, uploadId, parts } = req.body || {};
    if (!key || !uploadId || !Array.isArray(parts) || parts.length === 0) return res.status(400).json({ error: 'body inválido' });
    // Asegurar tipos correctos
    const mapped = parts.map(p => ({ ETag: p.ETag, PartNumber: Number(p.PartNumber) })).sort((a,b)=>a.PartNumber-b.PartNumber);
    const r = await completeMultipart(key, uploadId, mapped);
    return res.json({ ok: true, location: r.Location || null, etag: r.ETag || null, key: r.Key || key });
  } catch (e) {
    console.error('complete multipart', e);
    return res.status(500).json({ error: 'complete_failed' });
  }
});

router.post('/api/uploads/multipart/abort', authRequired, async (req, res) => {
  try {
    const { key, uploadId } = req.body || {};
    if (!key || !uploadId) return res.status(400).json({ error: 'key y uploadId requeridos' });
    await abortMultipart(key, uploadId);
    return res.json({ ok: true });
  } catch (e) {
    console.error('abort multipart', e);
    return res.status(500).json({ error: 'abort_failed' });
  }
});

router.get('/api/files', authRequired, async (req, res) => {
  try {
    const prefix = (req.query.prefix || '').toString();
    const items = await list(prefix);
    return res.json({ items });
  } catch (e) {
    console.error('list files', e);
    return res.status(500).json({ error: 'list_failed' });
  }
});

module.exports = router;
