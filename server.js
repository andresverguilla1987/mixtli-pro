
/**
 * Mixtli API — Upload 50MB (Express + Multer + Cloudflare R2/S3)
 * Start: node server.js
 */
require('dotenv').config();
const express = require('express');
const multer  = require('multer');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

const app = express();

// ====== Config ======
const PORT = process.env.PORT || 10000;
const MAX_UPLOAD_MB = parseInt(process.env.MAX_UPLOAD_MB || '50', 10);
const MAX_UPLOAD_BYTES = MAX_UPLOAD_MB * 1024 * 1024;
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);

// ====== Body limits for JSON/URL-encoded (no afecta multipart) ======
app.use(express.json({ limit: `${MAX_UPLOAD_MB}mb` }));
app.use(express.urlencoded({ extended: true, limit: `${MAX_UPLOAD_MB}mb` }));

// ====== CORS muy permisivo pero acotado a ALLOWED_ORIGINS ======
app.use((req, res, next) => {
  const origin = req.headers.origin;
  const allowed =
    !origin ||
    ALLOWED_ORIGINS.includes('*') ||
    ALLOWED_ORIGINS.includes(origin);

  if (allowed) {
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,x-mixtli-token');
    res.setHeader('Access-Control-Expose-Headers', 'ETag,Location,x-amz-request-id');
    res.setHeader('Access-Control-Max-Age', '86400');
  }
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// ====== Multer (50 MB) ======
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_BYTES },
});

// ====== S3 Client (Cloudflare R2 compatible) ======
const s3 = new S3Client({
  region: process.env.AWS_REGION || 'auto',
  endpoint: process.env.R2_ENDPOINT, // ej. https://<account>.r2.cloudflarestorage.com
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

// ====== Health ======
app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    mode: 'server-upload',
    version: 'zip-50mb',
    maxMB: MAX_UPLOAD_MB,
    time: new Date().toISOString(),
  });
});

// ====== Upload ======
app.post('/api/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ ok: false, error: 'no_file' });
    const folder = (req.body.folder || '').replace(/^\/+/, '').replace(/\.+/g, '/');
    const key = `${folder ? folder + '/' : ''}${req.file.originalname}`;

    await s3.send(new PutObjectCommand({
      Bucket: process.env.R2_BUCKET,
      Key: key,
      Body: req.file.buffer,
      ContentType: req.file.mimetype || 'application/octet-stream',
      ACL: 'private', // o 'public-read' si tu bucket lo permite
    }));

    // URL pública (si configuras un dominio público R2 o r2.dev):
    const publicUrl = process.env.PUBLIC_BASE_URL
      ? `${process.env.PUBLIC_BASE_URL.replace(/\/$/, '')}/${key}`
      : undefined;

    res.status(201).json({ ok: true, key, publicUrl });
  } catch (err) {
    console.error('upload error:', err);
    if (err && err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ ok: false, error: 'file_too_large', maxMB: MAX_UPLOAD_MB });
    }
    res.status(500).json({ ok: false, error: 'upload_failed' });
  }
});

// ====== Root ======
app.get('/', (req, res) => {
  res.type('text').send('Mixtli API is running');
});

app.listen(PORT, () => {
  console.log(`Mixtli API (50MB) on :${PORT}`);
});
