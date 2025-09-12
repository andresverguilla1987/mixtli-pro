import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import crypto from 'crypto';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { S3RequestPresigner } from '@aws-sdk/s3-request-presigner';
import { Hash } from '@aws-sdk/hash-node';
import { formatUrl } from '@aws-sdk/util-format-url';

const app = express();
app.use('/api/upload', express.raw({ type: '*/*', limit: '200mb' }));
app.use(express.json({ limit: '5mb' }));

app.use(cors()); // Render sits behind Netlify proxy; tighten later if needed.

const s3 = new S3Client({
  region: process.env.R2_REGION || 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY }
});

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, mode: 'server-upload', time: new Date().toISOString() });
});

app.post('/api/upload', async (req, res) => {
  try {
    const filename = (req.query.filename || 'archivo.bin').toString();
    const contentType = (req.query.contentType || 'application/octet-stream').toString();
    const key = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}-${filename}`;

    await s3.send(new PutObjectCommand({
      Bucket: process.env.R2_BUCKET,
      Key: key,
      Body: req.body,
      ContentType: contentType
    }));

    const presigner = new S3RequestPresigner({ ...s3.config, sha256: Hash.bind(null, 'sha256') });
    const signed = await presigner.presign(new GetObjectCommand({
      Bucket: process.env.R2_BUCKET,
      Key: key
    }), { expiresIn: 600 });

    const downloadUrl = formatUrl(signed);
    const pubBase = process.env.PUBLIC_BASE_URL || null;
    const publicUrl = pubBase ? `${pubBase.replace(/\/$/, '')}/${encodeURIComponent(key)}` : null;

    res.json({ status: 'ok', key, downloadUrl, publicUrl });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'upload_failed', message: String(e) });
  }
});

const port = process.env.PORT || 10000;
app.listen(port, () => console.log(`Mixtli server-upload on :${port}`));
