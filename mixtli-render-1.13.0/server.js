
import express from "express";
import morgan from "morgan";
import { config as dotenv } from "dotenv";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import fetch from "node-fetch";
import exifr from "exifr";
import sqlite3 from "sqlite3";
import { open } from "sqlite";
import rateLimit from "express-rate-limit";
import sharp from "sharp";
import archiver from "archiver";
import { Readable } from "stream";

import {
  S3Client, HeadBucketCommand, ListObjectsV2Command,
  PutObjectCommand, GetObjectCommand, DeleteObjectCommand,
  CopyObjectCommand, CreateMultipartUploadCommand, CompleteMultipartUploadCommand, AbortMultipartUploadCommand
} from "@aws-sdk/client-s3";
import { UploadPartCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

dotenv();

const PORT = process.env.PORT || 10000;
const S3_ENDPOINT = process.env.S3_ENDPOINT;
const S3_REGION = process.env.S3_REGION || "auto";
const S3_BUCKET = process.env.S3_BUCKET;
const S3_ACCESS_KEY_ID = process.env.S3_ACCESS_KEY_ID;
const S3_SECRET_ACCESS_KEY = process.env.S3_SECRET_ACCESS_KEY;
const S3_FORCE_PATH_STYLE = String(process.env.S3_FORCE_PATH_STYLE || "true") === "true";
const ALLOWED_ORIGINS = (()=>{ try{return JSON.parse(process.env.ALLOWED_ORIGINS||"[]");}catch{return []} })();

const MAX_SIZE_MB = Number(process.env.MAX_SIZE_MB || 200);
const ALLOWED_MIME = (process.env.ALLOWED_MIME || "image/jpeg,image/png,image/webp,video/mp4,application/pdf").split(",").map(s=>s.trim()).filter(Boolean);
const JWT_SECRET = process.env.JWT_SECRET || "";
const WEBHOOK_URL = process.env.WEBHOOK_URL || "";
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || "";
const DEFAULT_READ_TTL = Math.min(Number(process.env.DEFAULT_READ_TTL || "300"), 86400);
const QUOTA_BYTES_PER_MONTH = Number(process.env.QUOTA_BYTES_PER_MONTH || 0); // 0 = ilimitado
const QUOTA_FILES_PER_MONTH = Number(process.env.QUOTA_FILES_PER_MONTH || 0); // 0 = ilimitado

const app = express();
app.use(express.json({ limit: "2mb" }));
app.use(morgan("dev"));
app.use(rateLimit({ windowMs: 60_000, max: 600 }));

// CORS
app.use((req,res,next)=>{
  const origin = req.headers.origin;
  if (!origin || ALLOWED_ORIGINS.includes(origin)) {
    if (origin) res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
    return next();
  }
  res.status(403).json({ ok:false, error:"CORS: Origin not allowed", origin, allowed: ALLOWED_ORIGINS });
});
app.options("*", (req,res)=>{
  res.setHeader("Access-Control-Allow-Methods","GET,POST,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers","Content-Type, Authorization");
  res.status(204).end();
});

// DB
const db = await open({ filename: process.env.SQLITE_FILE || "./mixtli.db", driver: sqlite3.Database });
await db.exec(`
  PRAGMA journal_mode=WAL;
  CREATE TABLE IF NOT EXISTS files(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    uid TEXT NOT NULL,
    key TEXT NOT NULL UNIQUE,
    size INTEGER,
    content_type TEXT,
    sha256 TEXT,
    capture_at DATETIME,
    camera TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    deleted_at DATETIME
  );
  CREATE INDEX IF NOT EXISTS idx_files_uid ON files(uid);
  CREATE INDEX IF NOT EXISTS idx_files_created ON files(created_at);
  CREATE INDEX IF NOT EXISTS idx_files_capture ON files(capture_at);

  CREATE TABLE IF NOT EXISTS tags(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key TEXT NOT NULL,
    tag TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_tags_key ON tags(key);
  CREATE INDEX IF NOT EXISTS idx_tags_tag ON tags(tag);

  CREATE TABLE IF NOT EXISTS notes(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key TEXT NOT NULL,
    note TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS shares(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key TEXT NOT NULL,
    token TEXT NOT NULL UNIQUE,
    pass_hash TEXT,
    ttl_seconds INTEGER DEFAULT 300,
    max_downloads INTEGER DEFAULT 0, -- 0 = ilimitado
    downloads INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    revoked_at DATETIME
  );
`);

// S3
const s3 = new S3Client({
  region: S3_REGION,
  endpoint: S3_ENDPOINT,
  forcePathStyle: S3_FORCE_PATH_STYLE,
  credentials: { accessKeyId: S3_ACCESS_KEY_ID, secretAccessKey: S3_SECRET_ACCESS_KEY }
});

const safe = s => String(s||"").replace(/[^a-zA-Z0-9._/-]/g,"_");
function ymd(d=new Date()){ const y=d.getUTCFullYear(); const m=String(d.getUTCMonth()+1).padStart(2,"0"); const dd=String(d.getUTCDate()).padStart(2,"0"); return {y,m,d:dd}; }
function buildKey(uid, filename){ const {y,m,d}=ymd(); const id=crypto.randomBytes(6).toString("hex"); return `users/${safe(uid||"anon")}/${y}/${m}/${d}/${Date.now()}_${id}_${safe(filename)}`; }

// Auth
function requireAuth(req,res,next){
  if(!JWT_SECRET){ req.user={ uid:"anon", roles:["admin"] }; return next(); }
  const h = req.headers.authorization || "";
  const m = h.match(/^Bearer\s+(.+)$/i);
  if(!m) return res.status(401).json({ ok:false, error:"AuthRequired" });
  try{
    const payload = jwt.verify(m[1], JWT_SECRET);
    req.user = { uid: payload.uid || payload.sub || "user", roles: payload.roles || [] };
    next();
  }catch(e){ res.status(401).json({ ok:false, error:"InvalidToken" }); }
}

// Webhooks
function signWebhook(body){ if(!WEBHOOK_SECRET) return ""; const h = crypto.createHmac("sha256", WEBHOOK_SECRET).update(JSON.stringify(body)).digest("hex"); return `sha256=${h}`; }
async function sendWebhook(event, payload){
  if(!WEBHOOK_URL) return;
  const body = { event, payload, ts: Date.now() };
  try {
    await fetch(WEBHOOK_URL, { method:"POST", headers:{ "Content-Type":"application/json", "X-Mixtli-Signature": signWebhook(body) }, body: JSON.stringify(body) });
  } catch {}
}

// Quotas
async function getMonthlyUsage(uid){
  const row = await db.get("SELECT SUM(size) as bytes, COUNT(*) as files FROM files WHERE uid=? AND strftime('%Y-%m', created_at)=strftime('%Y-%m','now') AND deleted_at IS NULL", uid);
  return { bytes: Number(row?.bytes||0), files: Number(row?.files||0) };
}

// --- Base routes ---
app.get(["/","/version"], (_req,res)=> res.json({ ok:true, name:"Mixtli Mini", version:"1.13.0" }));
app.get(["/salud","/api/health"], async (_req,res)=>{
  try{ await s3.send(new HeadBucketCommand({ Bucket:S3_BUCKET })); }catch{}
  res.json({ ok:true, version:"1.13.0", env:{ s3:Boolean(S3_BUCKET), auth:Boolean(JWT_SECRET), quotas:{ bytes:QUOTA_BYTES_PER_MONTH, files:QUOTA_FILES_PER_MONTH }}});
});

// Presign (enforce quotas roughly by maxSize check only informational; real enforcement after upload is hard here)
app.post("/api/presign", requireAuth, async (req,res)=>{
  try{
    const { filename, key:providedKey, contentType, maxSizeMB } = req.body||{};
    const ct = contentType || "application/octet-stream";
    if(ALLOWED_MIME.length && !ALLOWED_MIME.includes(ct)) return res.status(415).json({ ok:false, error:"UnsupportedMediaType", message:`Content-Type no permitido: ${ct}` });
    // Quotas (soft check): deny if files quota reached
    if(QUOTA_FILES_PER_MONTH>0){
      const u = await getMonthlyUsage(req.user.uid);
      if(u.files >= QUOTA_FILES_PER_MONTH) return res.status(429).json({ ok:false, error:"QuotaExceeded", which:"files", limit:QUOTA_FILES_PER_MONTH });
    }
    let key = providedKey;
    if(!key){
      if(!filename) return res.status(400).json({ ok:false, error:"BadRequest", message:"key requerido o filename" });
      key = buildKey(req.user.uid, filename);
    }
    const put = new PutObjectCommand({ Bucket:S3_BUCKET, Key:key, ContentType: ct });
    const url = await getSignedUrl(s3, put, { expiresIn: 300 });
    const limitMB = Math.min(Number(maxSizeMB||MAX_SIZE_MB), MAX_SIZE_MB);
    res.json({ ok:true, url, key, bucket:S3_BUCKET, maxSizeBytes: Math.floor(limitMB*1024*1024) });
  }catch(e){ res.status(500).json({ ok:false, error:String(e) }); }
});

// Commit (register + EXIF best-effort + quota bytes enforcement)
app.post("/api/commit", requireAuth, async (req,res)=>{
  try{
    const { key, size, contentType, sha256 } = req.body||{};
    if(!key) return res.status(400).json({ ok:false, error:"BadRequest", message:"key requerido" });

    if(QUOTA_BYTES_PER_MONTH>0){
      const u = await getMonthlyUsage(req.user.uid);
      if(u.bytes + Number(size||0) > QUOTA_BYTES_PER_MONTH){
        // Optional: delete the just-uploaded object if over-quota
        await s3.send(new DeleteObjectCommand({ Bucket:S3_BUCKET, Key:key }));
        return res.status(429).json({ ok:false, error:"QuotaExceeded", which:"bytes", limit:QUOTA_BYTES_PER_MONTH });
      }
    }

    // Best-effort EXIF for images
    let capture_at=null, camera=null;
    if(contentType && contentType.startsWith("image/")){
      try{
        const get = new GetObjectCommand({ Bucket:S3_BUCKET, Key:key });
        const url = await getSignedUrl(s3, get, { expiresIn: 120 });
        const buf = Buffer.from(await (await fetch(url)).arrayBuffer());
        const meta = await exifr.parse(buf, { pick: ["DateTimeOriginal","Make","Model"] });
        if(meta){
          if(meta.DateTimeOriginal) capture_at = new Date(meta.DateTimeOriginal).toISOString();
          const cameraTxt = [meta.Make, meta.Model].filter(Boolean).join(" ");
          camera = cameraTxt || null;
        }
      }catch{}
    }

    await db.run("INSERT OR IGNORE INTO files(uid,key,size,content_type,sha256,capture_at,camera) VALUES(?,?,?,?,?,?,?)",
      req.user.uid, key, Number(size)||null, contentType||null, sha256||null, capture_at, camera);

    await sendWebhook("file.committed", { uid:req.user.uid, key, size, contentType, sha256, capture_at, camera });
    res.json({ ok:true, key, capture_at, camera });
  }catch(e){ res.status(500).json({ ok:false, error:String(e) }); }
});

// Readlink
app.get("/api/readlink", requireAuth, async (req,res)=>{
  try{
    const key = req.query.key; const ttl = Math.min(Number(req.query.ttl||DEFAULT_READ_TTL), 86400);
    if(!key) return res.status(400).json({ ok:false, error:"BadRequest", message:"key requerido" });
    const get = new GetObjectCommand({ Bucket:S3_BUCKET, Key:key });
    const url = await getSignedUrl(s3, get, { expiresIn: ttl });
    res.json({ ok:true, url, key, expiresIn: ttl });
  }catch(e){ res.status(500).json({ ok:false, error:String(e) }); }
});

// Delete
app.delete("/api/file", requireAuth, async (req,res)=>{
  try{
    const key = req.query.key;
    if(!key) return res.status(400).json({ ok:false, error:"BadRequest", message:"key requerido" });
    await s3.send(new DeleteObjectCommand({ Bucket:S3_BUCKET, Key:key }));
    await db.run("UPDATE files SET deleted_at=CURRENT_TIMESTAMP WHERE key=?", key);
    await sendWebhook("file.deleted", { uid:req.user.uid, key });
    res.json({ ok:true, deleted:key });
  }catch(e){ res.status(500).json({ ok:false, error:String(e) }); }
});

// Move (copy+delete)
app.post("/api/move", requireAuth, async (req,res)=>{
  try{
    const { src, dst } = req.body||{};
    if(!src || !dst) return res.status(400).json({ ok:false, error:"BadRequest", message:"src y dst requeridos" });
    await s3.send(new CopyObjectCommand({ Bucket:S3_BUCKET, CopySource: `/${S3_BUCKET}/${encodeURIComponent(src)}`, Key: dst }));
    await s3.send(new DeleteObjectCommand({ Bucket:S3_BUCKET, Key: src }));
    await db.run("UPDATE files SET key=? WHERE key=?", dst, src);
    res.json({ ok:true, moved:{ from:src, to:dst } });
  }catch(e){ res.status(500).json({ ok:false, error:String(e) }); }
});

// List S3 (paginado)
app.get("/api/list", requireAuth, async (req,res)=>{
  try{
    const Prefix = req.query.prefix || undefined;
    const ContinuationToken = req.query.token || undefined;
    const MaxKeys = Math.min(Number(req.query.max||"50"), 1000) || 50;
    const data = await s3.send(new ListObjectsV2Command({ Bucket:S3_BUCKET, MaxKeys, Prefix, ContinuationToken }));
    res.json({ ok:true, items:(data.Contents||[]).map(o=>({ key:o.Key, size:o.Size, lastModified:o.LastModified })), nextToken: data.IsTruncated ? (data.NextContinuationToken||null) : null });
  }catch(e){ res.status(500).json({ ok:false, error:String(e) }); }
});

// List DB (pag)
app.get("/api/listdb", requireAuth, async (req,res)=>{
  try{
    const uid = req.query.uid || req.user.uid;
    const limit = Math.min(Number(req.query.limit||"50"), 200);
    const offset = Math.max(Number(req.query.offset||"0"), 0);
    const rows = await db.all("SELECT key,size,content_type,sha256,capture_at,camera,created_at,deleted_at FROM files WHERE uid=? ORDER BY created_at DESC LIMIT ? OFFSET ?", uid, limit, offset);
    res.json({ ok:true, items: rows });
  }catch(e){ res.status(500).json({ ok:false, error:String(e) }); }
});

// Tags & Notes
app.post("/api/tags", requireAuth, async (req,res)=>{
  try{
    const { key, tags } = req.body||{};
    if(!key || !Array.isArray(tags)) return res.status(400).json({ ok:false, error:"BadRequest" });
    await db.run("DELETE FROM tags WHERE key=?", key);
    for(const t of tags.slice(0,50)){ await db.run("INSERT INTO tags(key,tag) VALUES(?,?)", key, String(t).slice(0,64)); }
    res.json({ ok:true, key, tags });
  }catch(e){ res.status(500).json({ ok:false, error:String(e) }); }
});
app.post("/api/notes", requireAuth, async (req,res)=>{
  try{
    const { key, note } = req.body||{};
    if(!key || !note) return res.status(400).json({ ok:false, error:"BadRequest" });
    await db.run("INSERT INTO notes(key,note) VALUES(?,?)", key, String(note).slice(0,2000));
    res.json({ ok:true });
  }catch(e){ res.status(500).json({ ok:false, error:String(e) }); }
});

// Search
app.get("/api/search", requireAuth, async (req,res)=>{
  try{
    const { q="", tag, from, to, ct } = req.query;
    let where = "f.deleted_at IS NULL";
    const params = [];
    if(q){ where += " AND f.key LIKE ?"; params.push(`%${q}%`); }
    if(ct){ where += " AND f.content_type LIKE ?"; params.push(`${ct}%`); }
    if(from){ where += " AND COALESCE(f.capture_at,f.created_at) >= ?"; params.push(from); }
    if(to){ where += " AND COALESCE(f.capture_at,f.created_at) <= ?"; params.push(to); }
    if(tag){ where += " AND EXISTS(SELECT 1 FROM tags t WHERE t.key=f.key AND t.tag=?)"; params.push(tag); }
    const rows = await db.all(`SELECT f.key,f.size,f.content_type,f.capture_at,f.camera,f.created_at FROM files f WHERE ${where} ORDER BY COALESCE(f.capture_at,f.created_at) DESC LIMIT 200`, params);
    res.json({ ok:true, items: rows });
  }catch(e){ res.status(500).json({ ok:false, error:String(e) }); }
});

// Thumbnails (server)
app.post("/api/thumbnail", requireAuth, async (req,res)=>{
  try{
    const { key, width=480 } = req.body||{};
    if(!key) return res.status(400).json({ ok:false, error:"BadRequest" });
    const get = new GetObjectCommand({ Bucket:S3_BUCKET, Key:key });
    const url = await getSignedUrl(s3, get, { expiresIn: 300 });
    const buf = Buffer.from(await (await fetch(url)).arrayBuffer());
    const out = await sharp(buf).rotate().resize(Number(width)).jpeg({ quality:80 }).toBuffer();
    const tkey = `thumbs/${key}.jpg`;
    await s3.send(new PutObjectCommand({ Bucket:S3_BUCKET, Key:tkey, Body: out, ContentType:"image/jpeg" }));
    res.json({ ok:true, thumbnailKey: tkey });
  }catch(e){ res.status(500).json({ ok:false, error:String(e) }); }
});

// Multipart
app.post("/api/multipart/init", requireAuth, async (req,res)=>{
  try{
    const { filename, contentType } = req.body||{};
    if(!filename) return res.status(400).json({ ok:false, error:"BadRequest", message:"filename requerido" });
    const key = buildKey(req.user.uid, filename);
    const cmd = new CreateMultipartUploadCommand({ Bucket:S3_BUCKET, Key:key, ContentType: contentType||"application/octet-stream" });
    const out = await s3.send(cmd);
    res.json({ ok:true, key, uploadId: out.UploadId });
  }catch(e){ res.status(500).json({ ok:false, error:String(e) }); }
});
app.get("/api/multipart/sign", requireAuth, async (req,res)=>{
  try{
    const { key, uploadId, partNumber } = req.query;
    if(!key || !uploadId || !partNumber) return res.status(400).json({ ok:false, error:"BadRequest" });
    const cmd = new UploadPartCommand({ Bucket:S3_BUCKET, Key:key, UploadId:uploadId, PartNumber:Number(partNumber) });
    const url = await getSignedUrl(s3, cmd, { expiresIn: 300 });
    res.json({ ok:true, url });
  }catch(e){ res.status(500).json({ ok:false, error:String(e) }); }
});
app.post("/api/multipart/complete", requireAuth, async (req,res)=>{
  try{
    const { key, uploadId, parts } = req.body||{};
    if(!key || !uploadId || !Array.isArray(parts)) return res.status(400).json({ ok:false, error:"BadRequest" });
    await s3.send(new CompleteMultipartUploadCommand({ Bucket:S3_BUCKET, Key:key, UploadId:uploadId, MultipartUpload:{ Parts: parts } }));
    res.json({ ok:true, key });
  }catch(e){ res.status(500).json({ ok:false, error:String(e) }); }
});
app.post("/api/multipart/abort", requireAuth, async (req,res)=>{
  try{ const { key, uploadId } = req.body||{};
    if(!key || !uploadId) return res.status(400).json({ ok:false, error:"BadRequest" });
    await s3.send(new AbortMultipartUploadCommand({ Bucket:S3_BUCKET, Key:key, UploadId:uploadId }));
    res.json({ ok:true, aborted:true });
  }catch(e){ res.status(500).json({ ok:false, error:String(e) }); }
});

// ZIP multiple -> zips/<uuid>.zip
async function bufferToStream(buf){ const r = new Readable({ read(){ this.push(buf); this.push(null); } }); return r; }
app.post("/api/zip", requireAuth, async (req,res)=>{
  try{
    const { keys=[] } = req.body||{};
    if(!Array.isArray(keys) || keys.length===0) return res.status(400).json({ ok:false, error:"BadRequest", message:"keys requeridos" });
    const maxEntries = Math.min(keys.length, 50); // límite preventivo
    const outBuffers = [];
    // Creamos zip en memoria (ojo: no recomendado para >200MB)
    const archive = archiver('zip', { zlib: { level: 8 } });
    archive.on('warning', ()=>{});
    archive.on('error', err=>{ throw err; });
    archive.on('data', data=> outBuffers.push(data));
    archive._emitData = true; // hack para obtener buffers
    for(const k of keys.slice(0,maxEntries)){
      const get = new GetObjectCommand({ Bucket:S3_BUCKET, Key:k });
      const url = await getSignedUrl(s3, get, { expiresIn: 120 });
      const buf = Buffer.from(await (await fetch(url)).arrayBuffer());
      const name = k.split('/').pop();
      archive.append(buf, { name: name || 'file' });
    }
    await archive.finalize();
    const zipBuf = Buffer.concat(outBuffers);
    const zipKey = `zips/${uuidv4()}.zip`;
    await s3.send(new PutObjectCommand({ Bucket:S3_BUCKET, Key: zipKey, Body: zipBuf, ContentType: "application/zip" }));
    const rl = await getSignedUrl(s3, new GetObjectCommand({ Bucket:S3_BUCKET, Key: zipKey }), { expiresIn: 600 });
    res.json({ ok:true, key: zipKey, url: rl });
  }catch(e){ res.status(500).json({ ok:false, error:String(e) }); }
});
function uuidv4(){ return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c => (c ^ crypto.randomBytes(1)[0] & 15 >> c / 4).toString(16) ); }

// Shares
app.post("/api/share", requireAuth, async (req,res)=>{
  try{
    const { key, ttl=300, password, maxDownloads=0 } = req.body||{};
    if(!key) return res.status(400).json({ ok:false, error:"BadRequest" });
    const token = crypto.randomBytes(12).toString("base64url");
    const pass_hash = password ? crypto.createHash('sha256').update(password).digest('hex') : null;
    await db.run("INSERT INTO shares(key,token,pass_hash,ttl_seconds,max_downloads) VALUES(?,?,?,?,?)", key, token, pass_hash, Math.min(Number(ttl), 7*24*3600), Number(maxDownloads)||0);
    res.json({ ok:true, token, url:`/s/${token}` });
  }catch(e){ res.status(500).json({ ok:false, error:String(e) }); }
});
app.get("/api/share/list", requireAuth, async (req,res)=>{
  try{ const rows = await db.all("SELECT key,token,ttl_seconds,max_downloads,downloads,created_at,revoked_at FROM shares WHERE revoked_at IS NULL ORDER BY created_at DESC LIMIT 200"); res.json({ ok:true, items: rows }); }
  catch(e){ res.status(500).json({ ok:false, error:String(e) }); }
});
app.delete("/api/share/:token", requireAuth, async (req,res)=>{
  try{ await db.run("UPDATE shares SET revoked_at=CURRENT_TIMESTAMP WHERE token=?", req.params.token); res.json({ ok:true, revoked:req.params.token }); }
  catch(e){ res.status(500).json({ ok:false, error:String(e) }); }
});
// Public resolver (no auth)
app.get("/s/:token", async (req,res)=>{
  try{
    const tok = req.params.token; const p = req.query.p||"";
    const row = await db.get("SELECT key,pass_hash,ttl_seconds,max_downloads,downloads,revoked_at FROM shares WHERE token=?", tok);
    if(!row || row.revoked_at) return res.status(404).send("Not found");
    if(row.pass_hash){
      const ph = crypto.createHash('sha256').update(String(p)).digest('hex');
      if(ph !== row.pass_hash) return res.status(401).send("Password required");
    }
    if(row.max_downloads>0 && row.downloads>=row.max_downloads) return res.status(429).send("Download limit reached");
    const url = await getSignedUrl(s3, new GetObjectCommand({ Bucket:S3_BUCKET, Key: row.key }), { expiresIn: Math.min(row.ttl_seconds, 86400) });
    await db.run("UPDATE shares SET downloads=downloads+1 WHERE token=?", tok);
    res.redirect(url);
  }catch(e){ res.status(500).send("Error"); }
});

// Admin stats
app.get("/api/usage", requireAuth, async (req,res)=>{
  try{
    const u = await getMonthlyUsage(req.user.uid);
    res.json({ ok:true, month: new Date().toISOString().slice(0,7), usage: u, limits:{ bytes:QUOTA_BYTES_PER_MONTH, files:QUOTA_FILES_PER_MONTH } });
  }catch(e){ res.status(500).json({ ok:false, error:String(e) }); }
});
app.get("/api/admin/stats", requireAuth, async (_req,res)=>{
  try{
    const rows = await db.all("SELECT DATE(created_at) d, COUNT(*) c, SUM(size) s FROM files WHERE deleted_at IS NULL GROUP BY DATE(created_at) ORDER BY d DESC LIMIT 30");
    res.json({ ok:true, days: rows });
  }catch(e){ res.status(500).json({ ok:false, error:String(e) }); }
});

// 404
app.use((req,res)=> res.status(404).json({ ok:false, error:"Not Found", path:req.path }));

app.listen(PORT, ()=> console.log(`Mixtli Mini 1.13.0 on :${PORT}`));
