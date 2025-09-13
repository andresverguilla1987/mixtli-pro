
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import mime from 'mime-types';
import { fileTypeFromBuffer } from 'file-type';
import { S3Client, PutObjectCommand, GetObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const VERSION = 'fix-v3';

// ---- App ----
const app = express();
app.use(express.json());

// ---- CORS ----
const allowed = (process.env.ALLOWED_ORIGINS || '*')
  .split(',').map(s => s.trim()).filter(Boolean);
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowed.includes('*') || allowed.includes(origin)) return cb(null, true);
    return cb(new Error('CORS not allowed: ' + origin));
  },
  credentials: true
}));

// ---- R2 / S3 client ----
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_BUCKET     = process.env.R2_BUCKET;
const R2_REGION     = process.env.R2_REGION || 'auto';
const R2_ENDPOINT   = process.env.R2_ENDPOINT || (R2_ACCOUNT_ID ? `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com` : undefined);
const PUBLIC_BASE   = process.env.PUBLIC_BASE_URL || '';

const s3 = new S3Client({
  region: R2_REGION,
  endpoint: R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || ''
  }
});

// ---- Upload handling ----
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 100 * 1024 * 1024 } }); // 100MB

// ext -> canonical mime fallback
const EXT_TO_MIME = new Map(Object.entries({
  jpg: 'image/jpeg', jpeg: 'image/jpeg', jpe: 'image/jpeg',
  png: 'image/png', gif: 'image/gif', webp: 'image/webp',
  svg: 'image/svg+xml', bmp: 'image/bmp', avif: 'image/avif',
  heic: 'image/heic', heif: 'image/heif',
  pdf: 'application/pdf', txt: 'text/plain', csv: 'text/csv',
  mp4: 'video/mp4', mov: 'video/quicktime', mkv: 'video/x-matroska',
  zip: 'application/zip'
}));

// Very permissive lists; we prefer server-side sniffing to block really bad ones.
// You can tighten later.
const ALLOWED_EXT = new Set([...EXT_TO_MIME.keys()]);
const ALLOWED_MIME = new Set([
  ...new Set(EXT_TO_MIME.values()),
  'application/octet-stream'
]);

const SKIP = process.env.SKIP_TYPE_CHECK === '1';

function safeKey(k=''){
  return k.replace(/^\/+|\/+$/g,'').replace(/\s+/g,'_');
}

// ---------- Health ----------
app.get('/api/health', (req,res)=>{
  res.json({ ok:true, mode:'server-upload', version: VERSION, skipTypeCheck: SKIP, time:new Date().toISOString() });
});

// ---------- Debug: report types ----------
app.post('/api/debug/upload', upload.single('file'), async (req,res)=>{
  const f = req.file;
  if (!f) return res.status(400).json({ ok:false, error:'no_file' });
  const original = f.originalname || 'file';
  const ext = (original.split('.').pop() || '').toLowerCase();
  let contentType = f.mimetype || mime.lookup(ext) || 'application/octet-stream';
  let sniff = null;
  if (f.buffer) {
    try { const t = await fileTypeFromBuffer(f.buffer); sniff = t?.mime || null; } catch {}
  }
  res.json({ ok:true, original, ext, mimetype: f.mimetype, contentType, sniff });
});

// ---------- Upload ----------
app.post('/api/upload', upload.single('file'), async (req,res) => {
  try{
    const f = req.file;
    if (!f) return res.status(400).json({ ok:false, error:'no_file' });

    const original = f.originalname || 'file';
    const ext = (original.split('.').pop() || '').toLowerCase();

    // Base type from mimetype, ext fallback, and sniff
    let contentType = f.mimetype || mime.lookup(ext) || EXT_TO_MIME.get(ext) || 'application/octet-stream';

    // Try to sniff if octet-stream or suspicious
    let sniff = null;
    if (f.buffer) {
      try { const t = await fileTypeFromBuffer(f.buffer); if (t?.mime) sniff = t.mime; } catch {}
    }

    // Prefer sniff over octet-stream, or if mismatch but ext clearly image
    if (contentType === 'application/octet-stream' && sniff) {
      contentType = sniff;
    } else if (sniff && sniff.startsWith('image/') && EXT_TO_MIME.get(ext)?.startsWith('image/')) {
      // Normalize to a good image mime if both indicate image
      contentType = sniff;
    } else if (EXT_TO_MIME.has(ext) && contentType === 'application/octet-stream') {
      contentType = EXT_TO_MIME.get(ext);
    }

    // Validation (permissive). If falla, explica detalles y cómo saltar
    if (!SKIP) {
      const extOk = ALLOWED_EXT.has(ext);
      const mimeOk = ALLOWED_MIME.has(contentType) || (sniff && ALLOWED_MIME.has(sniff));
      if (!extOk && !mimeOk) {
        return res.status(415).json({
          ok:false, error:'unsupported_type',
          detail:{ ext, contentType, sniff, tip:'Pon SKIP_TYPE_CHECK=1 para saltar temporalmente' }
        });
      }
    }

    const folder = safeKey(req.body.folder || '');
    const key = `${folder ? folder + '/' : ''}${Date.now()}-${original.replace(/\s+/g,'_')}`;

    await s3.send(new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
      Body: f.buffer,
      ContentType: contentType
    }));

    const publicUrl = PUBLIC_BASE ? `${PUBLIC_BASE}/${key}` : null;
    res.json({ ok:true, key, publicUrl });
  }catch(e){
    console.error('upload_error', e);
    res.status(500).json({ ok:false, error:'upload_failed' });
  }
});

// ---------- Signed GET ----------
app.get('/api/signget', async (req,res)=>{
  try{
    const key = safeKey(req.query.key || '');
    if (!key) return res.status(400).json({ ok:false, error:'missing_key' });

    const url = await getSignedUrl(s3, new GetObjectCommand({ Bucket: R2_BUCKET, Key: key }), { expiresIn: 600 });
    res.json({ ok:true, url });
  }catch(e){
    console.error('signget_error', e);
    res.status(500).json({ ok:false, error:'signget_failed' });
  }
});

// ---------- List ----------
app.get('/api/list', async (req,res)=>{
  try{
    const prefix = safeKey(req.query.prefix || '');
    const limit = Math.min(parseInt(req.query.limit||'100',10)||100, 1000);
    const out = await s3.send(new ListObjectsV2Command({ Bucket: R2_BUCKET, Prefix: prefix || undefined, MaxKeys: limit }));
    const contents = (out.Contents || []).map(o => ({ key: o.Key, size: o.Size, lastModified: o.LastModified }));
    res.json({ ok:true, contents });
  }catch(e){
    console.error('list_error', e);
    res.status(500).json({ ok:false, error:'list_failed' });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, ()=> console.log('Mixtli server (fix-v3) on :' + PORT));
