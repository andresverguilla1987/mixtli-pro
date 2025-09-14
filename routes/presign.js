import { Router } from 'express';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const router = Router();

const s3 = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: { accessKeyId: process.env.R2_KEY, secretAccessKey: process.env.R2_SECRET }
});

function safeName(name) { return String(name || 'file').replace(/[^\w.\-]+/g, '_').slice(0, 180); }

router.post('/presign', async (req, res) => {
  try {
    const { name, type } = req.body || {};
    if (!name || !type) return res.status(400).json({ error: 'name and type required' });
    const now = new Date();
    const yyyy = now.getUTCFullYear();
    const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(now.getUTCDate()).padStart(2, '0');
    const key = `uploads/${yyyy}/${mm}/${dd}/${Date.now()}-${safeName(name)}`;

    const cmd = new PutObjectCommand({ Bucket: process.env.R2_BUCKET, Key: key, ContentType: type });
    const url = await getSignedUrl(s3, cmd, { expiresIn: 60 * 5 });

    res.json({ key, url, headers: { 'Content-Type': type } });
  } catch (e) {
    res.status(500).json({ error: 'presign failed', detail: String(e?.message || e) });
  }
});

export default router;
