import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import crypto from 'crypto';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const app = express();

/* ===== CORS ROBUSTO v3d: defaults + env (unión, normalizado) ===== */
const normalize = (s) => (s || '').toLowerCase().replace(/\/$/, '').trim();
const DEFAULT_ORIGINS = ['https://lovely-bienenstitch-6344a1.netlify.app'];
const envOrigins = (process.env.ALLOWED_ORIGINS || '').split(',').map(normalize).filter(Boolean);
const ALLOWED = Array.from(new Set([...DEFAULT_ORIGINS.map(normalize), ...envOrigins]));
const ALLOWED_SET = new Set(ALLOWED);

console.log('[CORS] ALLOWED_ORIGINS (final) =', ALLOWED);

// Log de todas las OPTIONS para ver qué pide el navegador
app.use((req, res, next) => {
  if (req.method === 'OPTIONS') {
    console.log('[OPTIONS]', {
      path: req.path,
      origin: req.headers.origin,
      reqMethod: req.headers['access-control-request-method'],
      reqHeaders: req.headers['access-control-request-headers']
    });
  }
  next();
});

// Vary por Origin (caches/proxies)
app.use((req, res, next) => { res.setHeader('Vary', 'Origin'); next(); });

app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true); // permite healthchecks/Postman
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

// Preflight con headers ACAO automáticos
app.options('*', cors());

/* ===== Body parser DESPUÉS de CORS ===== */
app.use(express.json({ limit: '1mb' }));

/* ===== Health ===== */
app.get('/api/health', (req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

/* ===== Endpoint de diagnóstico ===== */
app.get('/api/debug', (req, res) => {
  const origin = req.headers.origin || null;
  const normalized = normalize(origin);
  res.json({
    origin,
    normalized,
    allowed: ALLOWED,
    match: origin ? ALLOWED_SET.has(normalized) : true,
    request: {
      method: req.method,
      path: req.path,
      headers: {
        host: req.headers.host,
        'access-control-request-method': req.headers['access-control-request-method'] || null,
        'access-control-request-headers': req.headers['access-control-request-headers'] || null
      }
    }
  });
});

/* ===== AWS S3 (R2) ===== */
function makeS3() {
  const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY } = process.env;
  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
    throw new Error('Faltan credenciales R2 en .env');
  }
  return new S3Client({
    region: 'auto',
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
  });
}
const s3 = makeS3();

function extFromName(name='') { const i = name.lastIndexOf('.'); return i >= 0 ? name.slice(i) : ''; }
function safeKey(filename='file.bin') {
  const stamp = Date.now();
  const rand = crypto.randomBytes(6).toString('hex');
  const ext = extFromName(filename).toLowerCase().slice(0, 10);
  return `${stamp}-${rand}${ext}`;
}
const MAX_BYTES = 50 * 1024 * 1024;

app.post('/api/presign', async (req, res) => {
  try {
    const { filename, type, size } = req.body || {};
    if (typeof size !== 'number' || size <= 0) {
      return res.status(400).json({ error: 'size requerido (bytes)' });
    }
    if (size > MAX_BYTES) return res.status(413).json({ error: 'Archivo excede 50 MB' });
    const Bucket = process.env.R2_BUCKET;
    if (!Bucket) return res.status(500).json({ error: 'Falta R2_BUCKET' });

    const Key = safeKey(filename);
    const ContentType = (typeof type === 'string' && type) ? type : 'application/octet-stream';

    const command = new PutObjectCommand({ Bucket, Key, ContentType });
    const url = await getSignedUrl(s3, command, { expiresIn: 60 * 60 });

    const publicBase = process.env.R2_PUBLIC_BASE || `https://${Bucket}.${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
    const publicUrl = `${publicBase}/${Key}`;

    console.log('[PRESIGN]', { key: Key, ct: ContentType, size, urlShort: url.slice(0, 80) + '...' });
    res.json({ url, key: Key, bucket: Bucket, publicUrl, expiresIn: 3600 });
  } catch (err) {
    console.error('presign error:', err);
    res.status(500).json({ error: 'presign failed', detail: String(err?.message || err) });
  }
});

/* ===== Error handler para CORS (responde 403 con detalle) ===== */
app.use((err, req, res, next) => {
  if (err && /CORS not allowed/.test(String(err.message || err))) {
    return res.status(403).json({
      error: 'cors',
      message: String(err.message || err),
      origin: req.headers.origin || null,
      allowed: ALLOWED
    });
  }
  next(err);
});

/* ===== Estáticos (para tests si quieres) ===== */
app.use('/', express.static('public', { extensions: ['html'], maxAge: 0 }));

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Mixtli API on :${PORT}`));
