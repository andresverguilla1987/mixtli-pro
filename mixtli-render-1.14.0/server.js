
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
const QUOTA_BYTES_PER_MONTH = Number(process.env.QUOTA_BYTES_PER_MONTH || 0);
const QUOTA_FILES_PER_MONTH = Number(process.env.QUOTA_FILES_PER_MONTH || 0);

const WATERMARK_DEFAULT_TEXT = process.env.WATERMARK_DEFAULT_TEXT || "";
const WATERMARK_DEFAULT_OPACITY = Number(process.env.WATERMARK_DEFAULT_OPACITY || 0.2);
const WATERMARK_DEFAULT_POS = process.env.WATERMARK_DEFAULT_POS || "br"; // tl,tr,bl,br,c

const RETENTION_DAYS_DEFAULT = Number(process.env.RETENTION_DAYS_DEFAULT || 0);

const app = express();
app.use(express.json({ limit: "3mb" }));
app.use(morgan("dev"));
app.use(rateLimit({ windowMs: 60_000, max: 900 }));

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

  CREATE TABLE IF NOT EXISTS tags(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key TEXT NOT NULL,
    tag TEXT NOT NULL
  );

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
    max_downloads INTEGER DEFAULT 0,
    downloads INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    revoked_at DATETIME
  );

  -- v1.14 extra
  CREATE TABLE IF NOT EXISTS albums(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    uid TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    cover_key TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS album_items(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    album_id INTEGER NOT NULL,
    key TEXT NOT NULL,
    ord INTEGER DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS events(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ts DATETIME DEFAULT CURRENT_TIMESTAMP,
    uid TEXT,
    type TEXT,
    detail TEXT
  );
  CREATE TABLE IF NOT EXISTS rules(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    enabled INTEGER DEFAULT 1,
    match_ct TEXT,
    min_size INTEGER,
    action TEXT,
    param TEXT
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

// Auth / Roles
function requireAuth(req,res,next){
  if(!JWT_SECRET){ req.user={ uid:"anon", roles:["admin","uploader","viewer"] }; return next(); }
  const h = req.headers.authorization || "";
  const m = h.match(/^Bearer\s+(.+)$/i);
  if(!m) return res.status(401).json({ ok:false, error:"AuthRequired" });
  try{
    const payload = jwt.verify(m[1], JWT_SECRET);
    req.user = { uid: payload.uid || payload.sub || "user", roles: payload.roles || ["viewer"] };
    next();
  }catch(e){ res.status(401).json({ ok:false, error:"InvalidToken" }); }
}
const needRole = role => (req,res,next)=> (req.user?.roles||[]).includes(role) ? next() : res.status(403).json({ ok:false, error:"Forbidden" });

// Webhooks + Audit
function signWebhook(body){ if(!WEBHOOK_SECRET) return ""; const h = crypto.createHmac("sha256", WEBHOOK_SECRET).update(JSON.stringify(body)).digest("hex"); return `sha256=${h}`; }
async function sendWebhook(event, payload){
  if(!WEBHOOK_URL) return;
  const body = { event, payload, ts: Date.now() };
  try { await fetch(WEBHOOK_URL, { method:"POST", headers:{ "Content-Type":"application/json", "X-Mixtli-Signature": signWebhook(body) }, body: JSON.stringify(body) }); } catch {}
}
async function audit(uid, type, detail){ try{ await db.run("INSERT INTO events(uid,type,detail) VALUES(?,?,?)", uid||null, type, typeof detail==="string"?detail:JSON.stringify(detail)); }catch{} }

// Quotas
async function getMonthlyUsage(uid){
  const row = await db.get("SELECT SUM(size) as bytes, COUNT(*) as files FROM files WHERE uid=? AND strftime('%Y-%m', created_at)=strftime('%Y-%m','now') AND deleted_at IS NULL", uid);
  return { bytes: Number(row?.bytes||0), files: Number(row?.files||0) };
}

// Base routes
app.get(["/","/version"], (_req,res)=> res.json({ ok:true, name:"Mixtli Mini", version:"1.14.0" }));
app.get(["/salud","/api/health"], async (_req,res)=>{
  try{ await s3.send(new HeadBucketCommand({ Bucket:S3_BUCKET })); }catch{}
  res.json({ ok:true, version:"1.14.0", env:{ s3:Boolean(S3_BUCKET), auth:Boolean(JWT_SECRET), quotas:{ bytes:QUOTA_BYTES_PER_MONTH, files:QUOTA_FILES_PER_MONTH }}});
});

// Presign
app.post("/api/presign", requireAuth, needRole("uploader"), async (req,res)=>{
  try{
    const { filename, key:providedKey, contentType, maxSizeMB } = req.body||{};
    const ct = contentType || "application/octet-stream";
    if(ALLOWED_MIME.length && !ALLOWED_MIME.includes(ct)) return res.status(415).json({ ok:false, error:"UnsupportedMediaType", message:`Content-Type no permitido: ${ct}` });

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
    await audit(req.user.uid, "presign", { key, contentType:ct });
    res.json({ ok:true, url, key, bucket:S3_BUCKET, maxSizeBytes: Math.floor(limitMB*1024*1024) });
  }catch(e){ res.status(500).json({ ok:false, error:String(e) }); }
});

// Commit (EXIF + quotas + simple auto-tags + rules)
app.post("/api/commit", requireAuth, async (req,res)=>{
  try{
    const { key, size, contentType, sha256 } = req.body||{};
    if(!key) return res.status(400).json({ ok:false, error:"BadRequest", message:"key requerido" });

    if(QUOTA_BYTES_PER_MONTH>0){
      const u = await getMonthlyUsage(req.user.uid);
      if(u.bytes + Number(size||0) > QUOTA_BYTES_PER_MONTH){
        await s3.send(new DeleteObjectCommand({ Bucket:S3_BUCKET, Key:key }));
        return res.status(429).json({ ok:false, error:"QuotaExceeded", which:"bytes", limit:QUOTA_BYTES_PER_MONTH });
      }
    }

    // EXIF (best-effort)
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

    // Auto-tags básicos
    const auto = [];
    if((contentType||"").startsWith("image/")) auto.push("image");
    if((contentType||"").startsWith("video/")) auto.push("video");
    for(const t of auto){ await db.run("INSERT INTO tags(key,tag) VALUES(?,?)", key, t); }

    await audit(req.user.uid, "commit", { key, size, contentType });

    // Reglas simples
    const rules = await db.all("SELECT * FROM rules WHERE enabled=1 LIMIT 50");
    for(const r of rules){
      if(r.match_ct && contentType && !contentType.startsWith(r.match_ct)) continue;
      if(r.min_size && Number(size||0) < Number(r.min_size)) continue;
      if(r.action === "thumb480"){
        try{
          const get = new GetObjectCommand({ Bucket:S3_BUCKET, Key:key });
          const url = await getSignedUrl(s3, get, { expiresIn: 120 });
          const buf = Buffer.from(await (await fetch(url)).arrayBuffer());
          const out = await sharp(buf).rotate().resize(480).jpeg({ quality:80 }).toBuffer();
          const tkey = `thumbs/${key}.jpg`;
          await s3.send(new PutObjectCommand({ Bucket:S3_BUCKET, Key:tkey, Body: out, ContentType:"image/jpeg" }));
          await audit(req.user.uid, "rule.thumb480", { key, tkey });
        }catch{}
      }else if(r.action && r.action.startsWith("move:")){
        const dstPrefix = r.param || r.action.slice("move:".length);
        const base = key.split("/").pop();
        const dst = `${dstPrefix.replace(/\/+$/,'')}/${base}`;
        try{
          await s3.send(new CopyObjectCommand({ Bucket:S3_BUCKET, CopySource:`/${S3_BUCKET}/${encodeURIComponent(key)}`, Key: dst }));
          await s3.send(new DeleteObjectCommand({ Bucket:S3_BUCKET, Key:key }));
          await db.run("UPDATE files SET key=? WHERE key=?", dst, key);
          await audit(req.user.uid, "rule.move", { from:key, to:dst });
        }catch{}
      }
    }

    res.json({ ok:true, key, capture_at, camera, auto_tags:auto });
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
app.delete("/api/file", requireAuth, needRole("uploader"), async (req,res)=>{
  try{
    const key = req.query.key;
    if(!key) return res.status(400).json({ ok:false, error:"BadRequest", message:"key requerido" });
    await s3.send(new DeleteObjectCommand({ Bucket:S3_BUCKET, Key:key }));
    await db.run("UPDATE files SET deleted_at=CURRENT_TIMESTAMP WHERE key=?", key);
    await audit(req.user.uid, "delete", { key });
    res.json({ ok:true, deleted:key });
  }catch(e){ res.status(500).json({ ok:false, error:String(e) }); }
});

// Move
app.post("/api/move", requireAuth, needRole("uploader"), async (req,res)=>{
  try{
    const { src, dst } = req.body||{};
    if(!src || !dst) return res.status(400).json({ ok:false, error:"BadRequest", message:"src y dst requeridos" });
    await s3.send(new CopyObjectCommand({ Bucket:S3_BUCKET, CopySource: `/${S3_BUCKET}/${encodeURIComponent(src)}`, Key: dst }));
    await s3.send(new DeleteObjectCommand({ Bucket:S3_BUCKET, Key: src }));
    await db.run("UPDATE files SET key=? WHERE key=?", dst, src);
    await audit(req.user.uid, "move", { from:src, to:dst });
    res.json({ ok:true, moved:{ from:src, to:dst } });
  }catch(e){ res.status(500).json({ ok:false, error:String(e) }); }
});

// List S3
app.get("/api/list", requireAuth, async (req,res)=>{
  try{
    const Prefix = req.query.prefix || undefined;
    const ContinuationToken = req.query.token || undefined;
    const MaxKeys = Math.min(Number(req.query.max||"50"), 1000) || 50;
    const data = await s3.send(new ListObjectsV2Command({ Bucket:S3_BUCKET, MaxKeys, Prefix, ContinuationToken }));
    res.json({ ok:true, items:(data.Contents||[]).map(o=>({ key:o.Key, size:o.Size, lastModified:o.LastModified })), nextToken: data.IsTruncated ? (data.NextContinuationToken||null) : null });
  }catch(e){ res.status(500).json({ ok:false, error:String(e) }); }
});

// List DB
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
    await audit(req.user.uid, "tags", { key, tags });
    res.json({ ok:true, key, tags });
  }catch(e){ res.status(500).json({ ok:false, error:String(e) }); }
});
app.post("/api/notes", requireAuth, async (req,res)=>{
  try{
    const { key, note } = req.body||{};
    if(!key || !note) return res.status(400).json({ ok:false, error:"BadRequest" });
    await db.run("INSERT INTO notes(key,note) VALUES(?,?)", key, String(note).slice(0,2000));
    await audit(req.user.uid, "note", { key });
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

// Thumbnails with watermark
function wmPosition(pos, imgW, imgH, wmW, wmH, pad=12){
  const P = (pos||"br").toLowerCase();
  const xCenter = Math.round((imgW-wmW)/2), yCenter = Math.round((imgH-wmH)/2);
  if(P==="tl") return { x: pad, y: pad };
  if(P==="tr") return { x: imgW-wmW-pad, y: pad };
  if(P==="bl") return { x: pad, y: imgH-wmH-pad };
  if(P==="c" || P==="center") return { x:xCenter, y:yCenter };
  return { x: imgW-wmW-pad, y: imgH-wmH-pad };
}
app.post("/api/thumbnail", requireAuth, async (req,res)=>{
  try{
    const { key, width=480, watermark } = req.body||{};
    if(!key) return res.status(400).json({ ok:false, error:"BadRequest" });
    const get = new GetObjectCommand({ Bucket:S3_BUCKET, Key:key });
    const url = await getSignedUrl(s3, get, { expiresIn: 300 });
    const buf = Buffer.from(await (await fetch(url)).arrayBuffer());
    let img = sharp(buf).rotate().resize(Number(width));
    let compos = [];
    if(watermark){
      const opacity = Math.max(0, Math.min(Number(watermark.opacity||WATERMARK_DEFAULT_OPACITY), 1));
      const pos = watermark.pos || WATERMARK_DEFAULT_POS;
      if(watermark.text){
        const svg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="800" height="200">
          <style>
            .wm{ fill: white; font-size:48px; font-family: Arial, Helvetica, sans-serif; opacity:${opacity}; }
          </style>
          <text x="0" y="60" class="wm">${watermark.text}</text>
        </svg>`);
        const mark = sharp(svg);
        const resized = await mark.png().toBuffer();
        const meta = await img.metadata();
        const wmMeta = await sharp(resized).metadata();
        const { x, y } = wmPosition(pos, meta.width, meta.height, wmMeta.width, wmMeta.height);
        compos.push({ input: resized, top: y, left: x });
      }
      // Nota: logoUrl no se soporta sin fetch externo por CORS; se puede agregar si se hospeda en el bucket mismo.
    }
    let out = await (compos.length ? img.composite(compos) : img).jpeg({ quality:80 }).toBuffer();
    const tkey = `thumbs/${key}.jpg`;
    await s3.send(new PutObjectCommand({ Bucket:S3_BUCKET, Key:tkey, Body: out, ContentType:"image/jpeg" }));
    await audit(req.user.uid, "thumbnail", { key, tkey });
    res.json({ ok:true, thumbnailKey: tkey });
  }catch(e){ res.status(500).json({ ok:false, error:String(e) }); }
});

// Multipart (igual que 1.13)
app.post("/api/multipart/init", requireAuth, needRole("uploader"), async (req,res)=>{
  try{
    const { filename, contentType } = req.body||{};
    if(!filename) return res.status(400).json({ ok:false, error:"BadRequest", message:"filename requerido" });
    const key = buildKey(req.user.uid, filename);
    const cmd = new CreateMultipartUploadCommand({ Bucket:S3_BUCKET, Key:key, ContentType: contentType||"application/octet-stream" });
    const out = await s3.send(cmd);
    res.json({ ok:true, key, uploadId: out.UploadId });
  }catch(e){ res.status(500).json({ ok:false, error:String(e) }); }
});
app.get("/api/multipart/sign", requireAuth, needRole("uploader"), async (req,res)=>{
  try{
    const { key, uploadId, partNumber } = req.query;
    if(!key || !uploadId || !partNumber) return res.status(400).json({ ok:false, error:"BadRequest" });
    const cmd = new UploadPartCommand({ Bucket:S3_BUCKET, Key:key, UploadId:uploadId, PartNumber:Number(partNumber) });
    const url = await getSignedUrl(s3, cmd, { expiresIn: 300 });
    res.json({ ok:true, url });
  }catch(e){ res.status(500).json({ ok:false, error:String(e) }); }
});
app.post("/api/multipart/complete", requireAuth, needRole("uploader"), async (req,res)=>{
  try{
    const { key, uploadId, parts } = req.body||{};
    if(!key || !uploadId || !Array.isArray(parts)) return res.status(400).json({ ok:false, error:"BadRequest" });
    await s3.send(new CompleteMultipartUploadCommand({ Bucket:S3_BUCKET, Key:key, UploadId:uploadId, MultipartUpload:{ Parts: parts } }));
    res.json({ ok:true, key });
  }catch(e){ res.status(500).json({ ok:false, error:String(e) }); }
});
app.post("/api/multipart/abort", requireAuth, needRole("uploader"), async (req,res)=>{
  try{ const { key, uploadId } = req.body||{};
    if(!key || !uploadId) return res.status(400).json({ ok:false, error:"BadRequest" });
    await s3.send(new AbortMultipartUploadCommand({ Bucket:S3_BUCKET, Key:key, UploadId:uploadId }));
    res.json({ ok:true, aborted:true });
  }catch(e){ res.status(500).json({ ok:false, error:String(e) }); }
});

// ZIP multiple
function uuidv4(){ return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c => (c ^ crypto.randomBytes(1)[0] & 15 >> c / 4).toString(16) ); }
app.post("/api/zip", requireAuth, async (req,res)=>{
  try{
    const { keys=[] } = req.body||{};
    if(!Array.isArray(keys) || keys.length===0) return res.status(400).json({ ok:false, error:"BadRequest", message:"keys requeridos" });
    const maxEntries = Math.min(keys.length, 50);
    const archive = archiver('zip', { zlib: { level: 8 } });
    const bufs = [];
    archive.on('data', d=> bufs.push(d));
    archive.on('warning', ()=>{});
    archive.on('error', err=>{ throw err; });
    archive._emitData = true;
    for(const k of keys.slice(0,maxEntries)){
      const get = new GetObjectCommand({ Bucket:S3_BUCKET, Key:k });
      const url = await getSignedUrl(s3, get, { expiresIn: 120 });
      const buf = Buffer.from(await (await fetch(url)).arrayBuffer());
      const name = k.split('/').pop() || 'file';
      archive.append(buf, { name });
    }
    await archive.finalize();
    const zipBuf = Buffer.concat(bufs);
    const zipKey = `zips/${uuidv4()}.zip`;
    await s3.send(new PutObjectCommand({ Bucket:S3_BUCKET, Key: zipKey, Body: zipBuf, ContentType: "application/zip" }));
    const rl = await getSignedUrl(s3, new GetObjectCommand({ Bucket:S3_BUCKET, Key: zipKey }), { expiresIn: 600 });
    await audit(req.user.uid, "zip", { keys: keys.length, zipKey });
    res.json({ ok:true, key: zipKey, url: rl });
  }catch(e){ res.status(500).json({ ok:false, error:String(e) }); }
});

// Shares (file) igual que 1.13
app.post("/api/share", requireAuth, async (req,res)=>{
  try{
    const { key, ttl=300, password, maxDownloads=0 } = req.body||{};
    if(!key) return res.status(400).json({ ok:false, error:"BadRequest" });
    const token = crypto.randomBytes(12).toString("base64url");
    const pass_hash = password ? crypto.createHash('sha256').update(password).digest('hex') : null;
    await db.run("INSERT INTO shares(key,token,pass_hash,ttl_seconds,max_downloads) VALUES(?,?,?,?,?)", key, token, pass_hash, Math.min(Number(ttl), 7*24*3600), Number(maxDownloads)||0);
    await audit(req.user.uid, "share.create", { key, token });
    res.json({ ok:true, token, url:`/s/${token}` });
  }catch(e){ res.status(500).json({ ok:false, error:String(e) }); }
});
app.get("/api/share/list", requireAuth, async (req,res)=>{
  try{ const rows = await db.all("SELECT key,token,ttl_seconds,max_downloads,downloads,created_at,revoked_at FROM shares WHERE revoked_at IS NULL ORDER BY created_at DESC LIMIT 200"); res.json({ ok:true, items: rows }); }
  catch(e){ res.status(500).json({ ok:false, error:String(e) }); }
});
app.delete("/api/share/:token", requireAuth, async (req,res)=>{
  try{ await db.run("UPDATE shares SET revoked_at=CURRENT_TIMESTAMP WHERE token=?", req.params.token); await audit(req.user.uid, "share.revoke", { token:req.params.token }); res.json({ ok:true, revoked:req.params.token }); }
  catch(e){ res.status(500).json({ ok:false, error:String(e) }); }
});
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

// Albums
app.post("/api/albums", requireAuth, async (req,res)=>{
  try{
    const { title, description, cover_key } = req.body||{};
    if(!title) return res.status(400).json({ ok:false, error:"BadRequest" });
    const r = await db.run("INSERT INTO albums(uid,title,description,cover_key) VALUES(?,?,?,?)", req.user.uid, String(title).slice(0,200), description||null, cover_key||null);
    await audit(req.user.uid, "album.create", { id:r.lastID, title });
    res.json({ ok:true, id:r.lastID });
  }catch(e){ res.status(500).json({ ok:false, error:String(e) }); }
});
app.get("/api/albums", requireAuth, async (req,res)=>{
  try{ const rows = await db.all("SELECT id,title,description,cover_key,created_at FROM albums WHERE uid=? ORDER BY created_at DESC LIMIT 200", req.user.uid); res.json({ ok:true, items: rows }); }
  catch(e){ res.status(500).json({ ok:false, error:String(e) }); }
});
app.post("/api/albums/:id/items", requireAuth, async (req,res)=>{
  try{
    const id = Number(req.params.id);
    const { keys=[] } = req.body||{};
    for(let i=0;i<Math.min(keys.length,500);i++){ await db.run("INSERT INTO album_items(album_id,key,ord) VALUES(?,?,?)", id, keys[i], i); }
    await audit(req.user.uid, "album.add", { id, count: keys.length });
    res.json({ ok:true });
  }catch(e){ res.status(500).json({ ok:false, error:String(e) }); }
});
app.get("/api/albums/:id/items", requireAuth, async (req,res)=>{
  try{
    const id = Number(req.params.id);
    const rows = await db.all("SELECT key,ord FROM album_items WHERE album_id=? ORDER BY ord ASC LIMIT 1000", id);
    res.json({ ok:true, items: rows });
  }catch(e){ res.status(500).json({ ok:false, error:String(e) }); }
});

// Admin: usage & stats & events & rules & retention
app.get("/api/usage", requireAuth, async (req,res)=>{
  try{ const u = await getMonthlyUsage(req.user.uid); res.json({ ok:true, month: new Date().toISOString().slice(0,7), usage: u, limits:{ bytes:QUOTA_BYTES_PER_MONTH, files:QUOTA_FILES_PER_MONTH } }); }
  catch(e){ res.status(500).json({ ok:false, error:String(e) }); }
});
app.get("/api/admin/stats", requireAuth, async (_req,res)=>{
  try{
    const rows = await db.all("SELECT DATE(created_at) d, COUNT(*) c, SUM(size) s FROM files WHERE deleted_at IS NULL GROUP BY DATE(created_at) ORDER BY d DESC LIMIT 30");
    res.json({ ok:true, days: rows });
  }catch(e){ res.status(500).json({ ok:false, error:String(e) }); }
});
app.get("/api/admin/events", requireAuth, needRole("admin"), async (req,res)=>{
  try{ const rows = await db.all("SELECT ts,uid,type,detail FROM events ORDER BY id DESC LIMIT 200"); res.json({ ok:true, items: rows }); }
  catch(e){ res.status(500).json({ ok:false, error:String(e) }); }
});
app.get("/api/admin/rules", requireAuth, needRole("admin"), async (req,res)=>{
  try{ const rows = await db.all("SELECT * FROM rules ORDER BY id DESC LIMIT 100"); res.json({ ok:true, items: rows }); }
  catch(e){ res.status(500).json({ ok:false, error:String(e) }); }
});
app.post("/api/admin/rules", requireAuth, needRole("admin"), async (req,res)=>{
  try{
    const { enabled=1, match_ct, min_size, action, param } = req.body||{};
    const r = await db.run("INSERT INTO rules(enabled,match_ct,min_size,action,param) VALUES(?,?,?,?,?)", enabled?1:0, match_ct||null, min_size||null, action, param||null);
    res.json({ ok:true, id:r.lastID });
  }catch(e){ res.status(500).json({ ok:false, error:String(e) }); }
});
app.post("/api/admin/retention/run", requireAuth, needRole("admin"), async (req,res)=>{
  try{
    const { prefix, days } = req.body||{};
    const d = Number(days || RETENTION_DAYS_DEFAULT);
    if(!prefix || !d) return res.status(400).json({ ok:false, error:"BadRequest" });
    // Simple: lista S3 por prefix y borra si LastModified supera días
    const cutoff = Date.now() - d*24*3600*1000;
    let token=undefined, deleted=0;
    do{
      const data = await s3.send(new ListObjectsV2Command({ Bucket:S3_BUCKET, Prefix: prefix, ContinuationToken: token }));
      for(const it of (data.Contents||[])){
        const lm = new Date(it.LastModified).getTime();
        if(lm < cutoff){
          await s3.send(new DeleteObjectCommand({ Bucket:S3_BUCKET, Key: it.Key }));
          await db.run("UPDATE files SET deleted_at=CURRENT_TIMESTAMP WHERE key=?", it.Key);
          deleted++;
        }
      }
      token = data.IsTruncated ? data.NextContinuationToken : undefined;
    }while(token);
    await audit(req.user.uid, "retention.run", { prefix, days: d, deleted });
    res.json({ ok:true, deleted });
  }catch(e){ res.status(500).json({ ok:false, error:String(e) }); }
});

// 404
app.use((req,res)=> res.status(404).json({ ok:false, error:"Not Found", path:req.path }));

app.listen(PORT, ()=> console.log(`Mixtli Mini 1.14.0 on :${PORT}`));
