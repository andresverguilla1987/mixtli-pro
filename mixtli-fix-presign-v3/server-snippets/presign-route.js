// Fragmento para usar dentro de tu server.js (Express + ESM)
import express from 'express';
import { presignPut } from '../utils/s3.js';

const router = express.Router();

// Opcional: healthcheck
router.get('/api/health', (req, res) => {
  res.status(200).json({ ok: true, service: 'Mixtli API', version: process.env.npm_package_version || 'dev' });
});

// Preflight CORS (si manejas CORS a nivel global puedes omitir este)
router.options('/api/presign', (req, res) => res.sendStatus(204));

// Presign upload
router.post('/api/presign', async (req, res) => {
  try {
    const body = req.body || {};
    const key = body.key || body.filename;
    const contentType = body.contentType || body.type || 'application/octet-stream';
    const expiresIn = Math.max(60, Math.min(Number(body.expiresIn) || 900, 3600));

    if (!key) {
      return res.status(400).json({
        ok: false,
        error: 'MISSING_KEY',
        message: "Body must include 'key' or 'filename'."
      });
    }

    const bucket = process.env.S3_BUCKET;
    if (!bucket) {
      return res.status(500).json({
        ok: false,
        error: 'MISSING_BUCKET',
        message: 'S3_BUCKET env var is required'
      });
    }

    const result = await presignPut({ bucket, key, contentType, expires: expiresIn });
    return res.json({ ok: true, ...result, contentType });
  } catch (err) {
    console.error('[presign error]', err);
    return res.status(500).json({ ok: false, error: 'PRESIGN_FAILED', message: err.message });
  }
});

export default router;

// En tu server.js principal, algo así:
// import presignRouter from './server-snippets/presign-route.js';
// app.use(presignRouter);