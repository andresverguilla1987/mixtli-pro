import express from 'express';
import morgan from 'morgan';
import cors from 'cors';
import { S3Client, GetObjectCommand, PutObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import mime from 'mime';
import { randomUUID as cryptoRandomUUID } from 'crypto';

const app = express();

// -------- Config --------
const PORT = process.env.PORT || 10000;
const BUCKET = process.env.S3_BUCKET;
const REGION = process.env.AWS_REGION || 'auto';
const ENDPOINT = process.env.S3_ENDPOINT || undefined; // R2 endpoint; leave undefined for AWS S3
const ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID;
const SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY;
const SIGNED_URL_TTL = parseInt(process.env.SIGNED_URL_TTL || '3600', 10);
const DEFAULT_PREFIX = process.env.DEFAULT_PREFIX || 'public/';

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
  endpoint: ENDPOINT,
  forcePathStyle: !!ENDPOINT,      // R2 needs path-style
  credentials: ACCESS_KEY_ID && SECRET_ACCESS_KEY ? {
    accessKeyId: ACCESS_KEY_ID,
    secretAccessKey: SECRET_ACCESS_KEY
  } : undefined
});

function safeRandomId() {
  try { return cryptoRandomUUID(); } 
  catch { return 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2,8); }
}

function decodeKey(k=''){
  try { return decodeURIComponent(k).replace(/^\/+/, ''); }
  catch { return String(k).replace(/^\/+/, ''); }
}

async function streamObject(res, key){
  const cmd = new GetObjectCommand({ Bucket: BUCKET, Key: key });
  const out = await s3.send(cmd);
  const ct = out.ContentType || mime.getType(key) || 'application/octet-stream';
  res.setHeader('Content-Type', ct);
  res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  out.Body.pipe(res);
}

// ---- Health ----
app.head('/', (_req, res) => res.status(200).end());
app.get('/', (_req, res) => res.status(200).send('Mixtli full backend up'));

// ---- API: list ----
app.get('/api/list', async (req, res) => {
  if(!BUCKET) return res.status(500).json({ error: 'S3_BUCKET not set' });
  const limit = Math.min(parseInt(req.query.limit || '160', 10), 1000);
  const prefix = String(req.query.prefix || '');
  try {
    const cmd = new ListObjectsV2Command({ Bucket: BUCKET, MaxKeys: limit, Prefix: prefix || undefined });
    const out = await s3.send(cmd);
    const items = (out.Contents || [])
      .filter(obj => !obj.Key.endsWith('/'))
      .sort((a,b) => (b.LastModified?.getTime()||0) - (a.LastModified?.getTime()||0))
      .map(obj => ({
        key: obj.Key,
        size: obj.Size || 0,
        type: mime.getType(obj.Key) || 'application/octet-stream',
        lastModified: obj.LastModified ? obj.LastModified.toISOString() : undefined
      }));
    res.json({ items });
  } catch (e) {
    res.status(500).json({ error: 'list_failed', details: e?.message });
  }
});

// ---- API: presign (PUT) ----
app.post('/api/presign', async (req, res) => {
  if(!BUCKET) return res.status(500).json({ error: 'S3_BUCKET not set' });
  const { filename, type, size, album } = req.body || {};
  const safeName = String(filename || ('upload-'+safeRandomId())).replace(/[^A-Za-z0-9._-]+/g, '_');
  const key = String(album ? album.replace(/\/+$/,'')+'/' : DEFAULT_PREFIX) + safeName;
  const contentType = String(type || mime.getType(safeName) || 'application/octet-stream');
  try {
    const cmd = new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      ContentType: contentType,
      ContentLength: typeof size === 'number' ? size : undefined
    });
    const url = await getSignedUrl(s3, cmd, { expiresIn: SIGNED_URL_TTL });
    res.json({ key, url, signedUrl: url, expiresIn: SIGNED_URL_TTL });
  } catch (e) {
    res.status(500).json({ error: 'presign_failed', details: e?.message });
  }
});

// ---- API: complete (no-op) ----
app.post('/api/complete', async (req, res) => {
  res.json({ ok: true, received: req.body || {} });
});

// ---- Preview: binary by path ----
app.get('/files/*', async (req, res) => {
  const raw = req.params[0] || '';
  const key = raw.split('/').map(seg => { try { return decodeURIComponent(seg); } catch { return seg; } }).join('/');
  if(!BUCKET) return res.status(500).json({ error: 'S3_BUCKET not set' });
  try { await streamObject(res, key); }
  catch (e) { res.status(404).json({ error: 'not found', key }); }
});

// ---- Preview: binary by query ----
app.get('/api/raw', async (req, res) => {
  const key = decodeKey(String(req.query.key || ''));
  if(!key) return res.status(400).json({ error: 'missing key' });
  if(!BUCKET) return res.status(500).json({ error: 'S3_BUCKET not set' });
  try { await streamObject(res, key); }
  catch (e) { res.status(404).json({ error: 'not found', key }); }
});

// ---- Preview: JSON with signed GET URL ----
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
  console.log('[Mixtli Full] listening on', PORT);
  console.log('[Mixtli Full] BUCKET:', BUCKET);
  console.log('[Mixtli Full] ENDPOINT:', ENDPOINT || '(aws s3 default)');
  console.log('[Mixtli Full] ALLOWED_ORIGINS:', allowed);
});
