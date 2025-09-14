const express = require('express');
const router = express.Router();
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

const s3 = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: { accessKeyId: process.env.R2_KEY, secretAccessKey: process.env.R2_SECRET }
});

function safeName(name) {
  return String(name || 'file').replace(/[^\w.\-]+/g, '_').slice(0, 180);
}

router.post('/presign', async (req, res) => {
  try {
    const { name, type, size } = req.body || {};
    if (!name || !type) return res.status(400).json({ error: 'name and type required' });
    const now = new Date();
    const yyyy = now.getUTCFullYear();
    const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(now.getUTCDate()).padStart(2, '0');
    const key = `uploads/${yyyy}/${mm}/${dd}/${Date.now()}-${safeName(name)}`;

    const cmd = new PutObjectCommand({
      Bucket: process.env.R2_BUCKET,
      Key: key,
      ContentType: type,
      // ACL no es necesario en R2; permisos por bucket/policy
    });

    const url = await getSignedUrl(s3, cmd, { expiresIn: 60 * 5 }); // 5 min

    // Si usas Prisma, podrías crear un registro aquí (opcional).

    res.json({
      key,
      url,
      headers: { 'Content-Type': type }
    });
  } catch (e) {
    console.error('presign error', e);
    res.status(500).json({ error: 'presign failed', detail: String(e?.message || e) });
  }
});

// Health fallback (si no lo tenías)
router.get('/health', (req, res) => res.json({ ok: true, service: 'mixtli-api', time: new Date().toISOString() }));

module.exports = router;
