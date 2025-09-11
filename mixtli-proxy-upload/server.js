// Mixtli — server upload mode (proxy friendly)
// Adds /api/upload to avoid browser→R2 CORS. Browser sends file to Render; Render puts to R2.
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import crypto from 'crypto';

import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { S3RequestPresigner } from '@aws-sdk/s3-request-presigner';
import { Hash } from '@aws-sdk/hash-node';
import { formatUrl } from '@aws-sdk/util-format-url';

const app = express();

// 200 MB file limit (adjust as you need)
app.use('/api/upload', express.raw({ type: '*/*', limit: '200mb' }));
app.use(express.json({ limit: '5mb' }));

const allowed = (process.env.ALLOWED_ORIGIN || '').split(',').map(s => s.trim()).filter(Boolean);
app.use(cors({
  origin: function (origin, cb) {
    if (!origin) return cb(null, true);
    if (allowed.length === 0 || allowed.includes(origin)) return cb(null, true);
    return cb(new Error('Not allowed by CORS: ' + origin));
  },
  methods: ['GET','POST','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization']
}));

const accountId = process.env.R2_ACCOUNT_ID;
const bucket = process.env.R2_BUCKET;
const region = process.env.R2_REGION || 'auto';
const accessKeyId = process.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
const pubBase = process.env.PUBLIC_BASE_URL || null;

const s3 = new S3Client({
  region,
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId, secretAccessKey },
});

app.get('/api/health', (_req, res) => res.json({ ok:true, time:new Date().toISOString(), mode:'server-upload' }));

// Upload via server (no presign, no browser→R2 CORS)
app.post('/api/upload', async (req, res) => {
  try {
    const filename = (req.query.filename || 'archivo.bin').toString();
    const contentType = (req.query.contentType || 'application/octet-stream').toString();
    const key = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}-${filename}`;
    await s3.send(new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: req.body,
      ContentType: contentType
    }));

    // Optional: create a temporary download link
    const presigner = new S3RequestPresigner({ ...s3.config, sha256: Hash.bind(null, 'sha256') });
    const get = new GetObjectCommand({ Bucket: bucket, Key: key });
    const signedGet = await presigner.presign(get, { expiresIn: 60 * 10 });
    const downloadUrl = formatUrl(signedGet);
    const publicUrl = pubBase ? `${pubBase.replace(/\/$/, '')}/${encodeURIComponent(key)}` : null;

    res.json({ status:'ok', key, downloadUrl, publicUrl });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error:'upload_failed', message:String(e) });
  }
});

const port = process.env.PORT || 10000;
app.listen(port, () => console.log(`Mixtli API (server-upload) on :${port}`));
