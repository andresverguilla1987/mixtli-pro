import express from 'express';
import morgan from 'morgan';
import cors from 'cors';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import mime from 'mime';

const app = express();

// -------- Config --------
const PORT = process.env.PORT || 10000;
const BUCKET = process.env.S3_BUCKET;
const REGION = process.env.AWS_REGION || 'auto';
const ENDPOINT = process.env.S3_ENDPOINT || undefined; // R2: https://<account>.r2.cloudflarestorage.com
const ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID;
const SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY;
const SIGNED_URL_TTL = parseInt(process.env.SIGNED_URL_TTL || '3600', 10);

// CORS
const allowed = (process.env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
const corsFn = cors({
  origin: function(origin, cb){
    if(!origin) return cb(null, true); // allow curl/postman
    if(allowed.includes(origin)) return cb(null, true);
    return cb(null, false);
  },
  credentials: false
});

app.use(morgan(':method :url :status :res[content-length] - :response-time ms'));
app.use(express.json({ limit: '2mb' }));
app.use(corsFn);
app.options('*', corsFn);

// S3/R2 client
const s3 = new S3Client({
  region: REGION,
  endpoint: ENDPOINT,              // for R2, set endpoint; for AWS S3 leave undefined
  forcePathStyle: !!ENDPOINT,      // R2 needs path-style
  credentials: ACCESS_KEY_ID && SECRET_ACCESS_KEY ? {
    accessKeyId: ACCESS_KEY_ID,
    secretAccessKey: SECRET_ACCESS_KEY
  } : undefined
});

function decodeKey(k=''){
  try {
    // Accept "public%2FIMG.jpg" or "public/IMG.jpg"
    return decodeURIComponent(k).replace(/^\/+/, '');
  } catch {
    return String(k).replace(/^\/+/, '');
  }
}

async function streamObject(res, key){
  const cmd = new GetObjectCommand({ Bucket: BUCKET, Key: key });
  const out = await s3.send(cmd);
  const ct = out.ContentType || mime.getType(key) || 'application/octet-stream';
  res.setHeader('Content-Type', ct);
  // Cache long; images/videos are immutable by key
  res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  // stream
  out.Body.pipe(res);
}

// ---- Health ----
app.head('/', (_req, res) => res.status(200).end());
app.get('/', (_req, res) => res.status(200).send('Mixtli preview backend up'));

// ---- Binary by path ----
app.get('/files/*', async (req, res) => {
  const raw = req.params[0] || '';
  // Accept both encoded and raw segments
  const key = raw.split('/').map(seg => {
    try { return decodeURIComponent(seg); } catch { return seg; }
  }).join('/');
  if(!BUCKET) return res.status(500).json({ error: 'S3_BUCKET not set' });
  try {
    await streamObject(res, key);
  } catch (e) {
    res.status(404).json({ error: 'not found', key });
  }
});

// ---- Binary by query ----
app.get('/api/raw', async (req, res) => {
  const key = decodeKey(String(req.query.key || ''));
  if(!key) return res.status(400).json({ error: 'missing key' });
  if(!BUCKET) return res.status(500).json({ error: 'S3_BUCKET not set' });
  try {
    await streamObject(res, key);
  } catch (e) {
    res.status(404).json({ error: 'not found', key });
  }
});

// ---- JSON with signed URL ----
app.get('/api/get', async (req, res) => {
  const key = decodeKey(String(req.query.key || ''));
  if(!key) return res.status(400).json({ error: 'missing key' });
  if(!BUCKET) return res.status(500).json({ error: 'S3_BUCKET not set' });
  try {
    const cmd = new GetObjectCommand({ Bucket: BUCKET, Key: key });
    const url = await getSignedUrl(s3, cmd, { expiresIn: SIGNED_URL_TTL });
    res.json({ url, expiresIn: SIGNED_URL_TTL });
  } catch (e) {
    res.status(404).json({ error: 'not found', key });
  }
});

// 404
app.use((req, res) => res.status(404).json({ error: 'route not found' }));

app.listen(PORT, () => {
  console.log('[Mixtli Preview] listening on', PORT);
  console.log('[Mixtli Preview] BUCKET:', BUCKET);
  console.log('[Mixtli Preview] ENDPOINT:', ENDPOINT || '(aws s3 default)');
  console.log('[Mixtli Preview] ALLOWED_ORIGINS:', allowed);
});
