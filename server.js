// Mixtli Mini V2 — server.js (Express + R2 presign PUT/GET)
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import crypto from 'crypto';

import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { S3RequestPresigner } from '@aws-sdk/s3-request-presigner';
import { Hash } from '@aws-sdk/hash-node';
import { formatUrl } from '@aws-sdk/util-format-url';

const app = express();
app.use(express.json({ limit: '5mb' }));

// CORS (solo aplica si llamas directo a Render desde el navegador)
const allowed = (process.env.ALLOWED_ORIGIN || '').split(',').map(s => s.trim()).filter(Boolean);
app.use(cors({
  origin: function (origin, cb) {
    if (!origin) return cb(null, true); // curl / Postman
    if (allowed.length === 0 || allowed.includes(origin)) return cb(null, true);
    return cb(new Error('Not allowed by CORS: ' + origin));
  },
  credentials: false,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// AWS S3 compatible (Cloudflare R2)
const accountId = process.env.R2_ACCOUNT_ID;
const bucket = process.env.R2_BUCKET;
const region = process.env.R2_REGION || 'auto';
const accessKeyId = process.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
const pubBase = process.env.PUBLIC_BASE_URL; // opcional (r2.dev)

if (!accountId || !bucket || !accessKeyId || !secretAccessKey) {
  console.warn('⚠️  Falta configuración R2 en variables de entorno.');
}

const s3 = new S3Client({
  region,
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId, secretAccessKey },
});

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, time: new Date().toISOString(), publicBaseUrl: pubBase || null });
});

// Presign PUT
app.post('/api/presign', async (req, res) => {
  try {
    const { filename, contentType } = req.body || {};
    if (!filename) return res.status(400).json({ error: 'filename requerido' });
    const key = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}-${filename}`;

    const put = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: contentType || 'application/octet-stream',
    });

    const presigner = new S3RequestPresigner({ ...s3.config, sha256: Hash.bind(null, 'sha256') });
    const signed = await presigner.presign(put, { expiresIn: 60 * 10 }); // 10 min

    const url = formatUrl(signed);
    res.json({ url, key, expiresIn: 600 });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'presign_failed', message: String(err) });
  }
});

// Complete → devuelve GET presign y, si procede, r2.dev
app.post('/api/complete', async (req, res) => {
  try {
    const { key } = req.body || {};
    if (!key) return res.status(400).json({ error: 'key requerido' });

    // presign GET por 10 min
    const presigner = new S3RequestPresigner({ ...s3.config, sha256: Hash.bind(null, 'sha256') });
    const get = new GetObjectCommand({ Bucket: bucket, Key: key });
    const signedGet = await presigner.presign(get, { expiresIn: 60 * 10 });
    const downloadUrl = formatUrl(signedGet);

    const publicUrl = pubBase ? `${pubBase.replace(/\/$/, '')}/${encodeURIComponent(key)}` : null;

    res.json({ status: 'ok', key, downloadUrl, publicUrl });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'complete_failed', message: String(e) });
  }
});

const port = process.env.PORT || 10000;
app.listen(port, () => {
  console.log(`PUBLIC_BASE_URL -> ${pubBase || '(no set)'}`);
  console.log(`Mixtli API on :${port}`);
});
