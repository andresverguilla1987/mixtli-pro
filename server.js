import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import crypto from 'crypto';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

/**
 * ======== ENV ========
 * R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET
 * R2_PUBLIC_BASE (https://pub-xxxx.r2.dev), R2_EXPIRES (seg, default 3600)
 * ALLOWED_ORIGINS (csv) -> ej: https://tu-sitio.netlify.app,http://localhost:8080
 * PORT (Render lo provee, default 10000)
 */
const {
  R2_ACCOUNT_ID,
  R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY,
  R2_BUCKET,
  R2_PUBLIC_BASE,
  R2_EXPIRES = '3600',
  ALLOWED_ORIGINS = '',
  PORT = '10000',
} = process.env;

const allowedOrigins = ALLOWED_ORIGINS.split(',').map(s => s.trim()).filter(Boolean);

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
});

const app = express();
app.use(express.json({ limit: '2mb' }));

// ---- CORS robusto ----
// Permite 'Origin: null' (file://) y lista blanca por ALLOWED_ORIGINS
const corsMiddleware = cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true); // permite file:// y herramientas locales
    if (allowedOrigins.length === 0 || allowedOrigins.includes(origin)) return cb(null, true);
    return cb(new Error('CORS bloqueado para ' + origin));
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
});
app.use(corsMiddleware);
app.options('*', corsMiddleware);

// ---- util ----
function safeName(name = 'file.bin') {
  return String(name).replace(/[^a-zA-Z0-9._-]/g, '_');
}
function makeKey(filename = 'file.bin') {
  const ts = Date.now();
  const rand = crypto.randomBytes(3).toString('hex');
  return `${ts}-${rand}-${safeName(filename)}`;
}

// ---- endpoints ----
app.get('/', (req, res) => {
  res.type('text/plain').send('Mixtli API OK. Prueba /api/health y /api/presign');
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', driver: 'R2', time: new Date().toISOString() });
});

async function createPresign(filename, contentType) {
  const key = makeKey(filename);
  const put = new PutObjectCommand({ Bucket: R2_BUCKET, Key: key, ContentType: contentType });
  const url = await getSignedUrl(s3, put, { expiresIn: Number(R2_EXPIRES) });
  const publicUrl = R2_PUBLIC_BASE ? `${R2_PUBLIC_BASE.replace(/\/$/, '')}/${key}` : null;
  return { key, url, method: 'PUT', headers: { 'Content-Type': contentType }, publicUrl, expiresIn: Number(R2_EXPIRES) };
}

app.get('/api/presign', async (req, res) => {
  try {
    const filename = req.query.filename || 'file.bin';
    const contentType = req.query.contentType || 'application/octet-stream';
    const presign = await createPresign(filename, contentType);
    res.json(presign);
  } catch (err) {
    console.error('GET presign error', err);
    res.status(500).json({ error: 'presign_failed', message: String(err) });
  }
});

app.post('/api/presign', async (req, res) => {
  try {
    const { filename = 'file.bin', contentType = 'application/octet-stream' } = req.body || {};
    const presign = await createPresign(filename, contentType);
    res.json(presign);
  } catch (err) {
    console.error('POST presign error', err);
    res.status(500).json({ error: 'presign_failed', message: String(err) });
  }
});

app.listen(Number(PORT), () => {
  console.log('🚀 API en puerto', PORT);
});
