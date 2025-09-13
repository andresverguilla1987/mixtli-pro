
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import mime from 'mime-types';
import { fileTypeFromBuffer } from 'file-type';
import { S3Client, PutObjectCommand, GetObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const app = express();
app.use(express.json());

// -------- CORS --------
const allowed = (process.env.ALLOWED_ORIGINS || '*')
  .split(',').map(s => s.trim()).filter(Boolean);

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowed.includes('*') || allowed.includes(origin)) return cb(null, true);
    return cb(new Error('CORS not allowed: ' + origin));
  },
  credentials: true
}));

// -------- R2 / S3 client --------
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

// -------- Upload handling --------
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 100 * 1024 * 1024 } }); // 100MB

const ALLOWED_EXT = new Set(['jpg','jpeg','png','gif','webp','svg','bmp','avif','heic','heif','pdf','mp4','mov','mkv','txt','csv','zip']);
const ALLOWED_MIME = new Set([
  'image/jpeg','image/png','image/gif','image/webp','image/svg+xml','image/bmp','image/avif','image/heic','image/heif',
  'application/pdf','video/mp4','video/quicktime','video/x-matroska','text/plain','text/csv','application/zip','application/x-zip-compressed'
]);

function safeKey(k=''){
  return k.replace(/^\/+|\/+$/g,'').replace(/\s+/g,'_');
}

app.get('/api/health', (req,res)=>{
  res.json({ ok:true, mode:'server-upload', time:new Date().toISOString() });
});

app.post('/api/upload', upload.single('file'), async (req,res) => {
  try{
    const f = req.file;
    if (!f) return res.status(400).json({ ok:false, error:'no_file' });

    const original = f.originalname || 'file';
    const ext = (original.split('.').pop() || '').toLowerCase();
    let contentType = f.mimetype || mime.lookup(ext) || 'application/octet-stream';

    // Si viene como octet-stream, tratamos de oler tipo real
    if (contentType === 'application/octet-stream' && f.buffer){
      try { const t = await fileTypeFromBuffer(f.buffer); if (t?.mime) contentType = t.mime; } catch {}
    }

    if (!ALLOWED_EXT.has(ext) && !ALLOWED_MIME.has(contentType)){
      return res.status(415).json({ ok:false, error:'unsupported_type', detail:{ ext, contentType } });
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

app.get('/api/list', async (req,res)=>{
  try{
    const prefix = safeKey(req.query.prefix || '');
    const limit = Math.min(parseInt(req.query.limit||'100',10)||100, 1000);
    const out = await s3.send(new ListObjectsV2Command({ Bucket: R2_BUCKET, Prefix: prefix || undefined, MaxKeys: limit }));
    const contents = (out.Contents || []).map(o => ({
      key: o.Key, size: o.Size, lastModified: o.LastModified
    }));
    res.json({ ok:true, contents });
  }catch(e){
    console.error('list_error', e);
    res.status(500).json({ ok:false, error:'list_failed' });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, ()=> console.log('Mixtli server (fix) on :' + PORT));
