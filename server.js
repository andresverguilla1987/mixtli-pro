import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import crypto from 'crypto';
import {
  S3Client, PutObjectCommand, HeadObjectCommand, GetObjectCommand
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const app = express();

/* ===== CORS robusto (default + env) ===== */
const normalize = (s) => (s || '').toLowerCase().replace(/\/$/, '').trim();
const DEFAULT_ORIGINS = ['https://lovely-bienenstitch-6344a1.netlify.app'];
const envOrigins = (process.env.ALLOWED_ORIGINS || process.env.ALLOWED_ORIGIN || '')
  .split(',').map(normalize).filter(Boolean);
const ALLOWED = Array.from(new Set([...DEFAULT_ORIGINS.map(normalize), ...envOrigins]));
const ALLOWED_SET = new Set(ALLOWED);
console.log('[CORS] ALLOWED_ORIGINS (final) =', ALLOWED);
app.use((req, res, next) => { res.setHeader('Vary', 'Origin'); next(); });
app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    const o = normalize(origin);
    if (ALLOWED_SET.has(o)) return cb(null, true);
    const err = new Error(`CORS not allowed: ${origin}`);
    console.error('[CORS] Rechazado:', { origin, normalized: o, ALLOWED });
    return cb(err);
  },
  methods: ['GET','POST','PUT','DELETE','OPTIONS','HEAD'],
  credentials: false,
  maxAge: 86400,
}));
app.options('*', cors());

/* ===== Body parser después de CORS ===== */
app.use(express.json({ limit: '1mb' }));

/* ===== Health/Debug ===== */
app.get('/api/health', (req, res) => res.json({ ok: true, time: new Date().toISOString() }));
app.get('/api/debug', (req, res) => {
  const origin = req.headers.origin || null;
  const normalized = normalize(origin);
  res.json({ origin, normalized, allowed: ALLOWED, match: origin ? ALLOWED_SET.has(normalized) : true });
});

/* ===== S3 (R2) ===== */
function makeS3() {
  const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY } = process.env;
  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
    throw new Error('Faltan credenciales R2');
  }
  return new S3Client({
    region: 'auto',
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
  });
}
const s3 = makeS3();

/* ===== Helpers ===== */
const MAX_BYTES = 50 * 1024 * 1024; // 50MB
const ALLOWED_MIME_PREFIXES = (process.env.ALLOWED_MIME_PREFIXES || 'image/,application/pdf')
  .split(',').map(s => s.trim()).filter(Boolean); // ej: "image/,application/pdf,video/mp4"

function extFromName(name='') { const i = name.lastIndexOf('.'); return i >= 0 ? name.slice(i) : ''; }
function safeKey(filename='file.bin') {
  const stamp = Date.now(); const rand = crypto.randomBytes(6).toString('hex');
  const ext = extFromName(filename).toLowerCase().slice(0, 10);
  return `${stamp}-${rand}${ext}`;
}
function mimeAllowed(type='') {
  if (!type) return false;
  return ALLOWED_MIME_PREFIXES.some(pref => type === pref || type.startsWith(pref));
}

/* ===== Presign PUT ===== */
app.post('/api/presign', async (req, res) => {
  try {
    const { filename, type, size } = req.body || {};
    if (typeof size !== 'number' || size <= 0) return res.status(400).json({ error: 'size requerido (bytes)' });
    if (size > MAX_BYTES) return res.status(413).json({ error: 'Archivo excede 50 MB' });
    if (!mimeAllowed(type)) return res.status(415).json({ error: 'MIME no permitido', allowed: ALLOWED_MIME_PREFIXES });

    const Bucket = process.env.R2_BUCKET;
    if (!Bucket) return res.status(500).json({ error: 'Falta R2_BUCKET' });

    const Key = safeKey(filename);
    const ContentType = type || 'application/octet-stream';
    const command = new PutObjectCommand({ Bucket, Key, ContentType });
    const url = await getSignedUrl(s3, command, { expiresIn: 60 * 60 }); // 1h

    const publicBase = process.env.R2_PUBLIC_BASE || `https://${Bucket}.${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
    const publicUrl = `${publicBase}/${Key}`;

    res.json({ url, key: Key, bucket: Bucket, publicUrl, expiresIn: 3600 });
  } catch (err) {
    console.error('presign error:', err);
    res.status(500).json({ error: 'presign failed', detail: String(err?.message || err) });
  }
});

/* ===== Complete ===== */
app.post('/api/complete', async (req, res) => {
  try {
    const { key } = req.body || {};
    if (!key) return res.status(400).json({ error: 'key requerida' });
    const Bucket = process.env.R2_BUCKET;
    const head = await s3.send(new HeadObjectCommand({ Bucket, Key: key }));
    const size = head.ContentLength;
    const type = head.ContentType;

    // TODO: aquí guardarías en DB (userId, key, size, type, createdAt)
    const getUrl = await getSignedUrl(s3, new GetObjectCommand({ Bucket, Key: key }), { expiresIn: 60 * 15 });

    res.json({ ok: true, key, size, type, getUrl });
  } catch (e) {
    console.error('complete error:', e);
    res.status(500).json({ error: 'complete failed', detail: String(e?.message || e) });
  }
});

/* ===== Estáticos de prueba ===== */
app.use('/', express.static('public', { extensions: ['html'], maxAge: 0 }));

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Mixtli API on :${PORT}`));
