
import express from "express";
import morgan from "morgan";
import { config as dotenv } from "dotenv";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import fetch from "node-fetch";
import { S3Client, HeadBucketCommand, ListObjectsV2Command, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, CreateMultipartUploadCommand, CompleteMultipartUploadCommand, AbortMultipartUploadCommand } from "@aws-sdk/client-s3";
import { UploadPartCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import sqlite3 from "sqlite3";
import { open } from "sqlite";
import rateLimit from "express-rate-limit";
import sharp from "sharp";

dotenv();

const PORT = process.env.PORT || 10000;
const S3_ENDPOINT = process.env.S3_ENDPOINT;
const S3_REGION = process.env.S3_REGION || "auto";
const S3_BUCKET = process.env.S3_BUCKET;
const S3_ACCESS_KEY_ID = process.env.S3_ACCESS_KEY_ID;
const S3_SECRET_ACCESS_KEY = process.env.S3_SECRET_ACCESS_KEY;
const S3_FORCE_PATH_STYLE = String(process.env.S3_FORCE_PATH_STYLE || "true") === "true";

const ALLOWED_ORIGINS = (() => { try { return JSON.parse(process.env.ALLOWED_ORIGINS || "[]"); } catch { return []; } })();
const MAX_SIZE_MB = Number(process.env.MAX_SIZE_MB || 200);
const ALLOWED_MIME = (() => {
  const raw = process.env.ALLOWED_MIME || "image/jpeg,image/png,image/webp,video/mp4,application/pdf";
  return raw.split(",").map(s=>s.trim()).filter(Boolean);
})();
const JWT_SECRET = process.env.JWT_SECRET || "";
const WEBHOOK_URL = process.env.WEBHOOK_URL || "";
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || "";
const DEFAULT_READ_TTL = Math.min(Number(process.env.DEFAULT_READ_TTL || "300"), 86400);

const app = express();
app.use(express.json({ limit: "2mb" }));
app.use(morgan("dev"));
app.use(rateLimit({ windowMs: 60_000, max: 300 })); // 300 req/min por IP

// CORS allowlist
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (!origin || ALLOWED_ORIGINS.includes(origin)) {
    if (origin) res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
    return next();
  }
  res.status(403).json({ ok:false, error:"CORS: Origin not allowed", origin, allowed: ALLOWED_ORIGINS });
});
app.options("*", (req, res) => {
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.status(204).end();
});

// DB (SQLite file)
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
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    deleted_at DATETIME
  );
  CREATE INDEX IF NOT EXISTS idx_files_uid ON files(uid);
  CREATE INDEX IF NOT EXISTS idx_files_created ON files(created_at);
`);

// S3
const s3 = new S3Client({
  region: S3_REGION,
  endpoint: S3_ENDPOINT,
  forcePathStyle: S3_FORCE_PATH_STYLE,
  credentials: { accessKeyId: S3_ACCESS_KEY_ID, secretAccessKey: S3_SECRET_ACCESS_KEY }
});

const safe = s => String(s||"").replace(/[^a-zA-Z0-9._/-]/g, "_");
const ymd = (d=new Date()) => {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth()+1).padStart(2,"0");
  const dd = String(d.getUTCDate()).padStart(2,"0");
  return {y,m:d= m, d:dd};
};

// Auth (HS256)
function requireAuth(req, _res, next) {
  if (!JWT_SECRET) { req.user = { uid: "anon", roles: ["admin"] }; return next(); } // modo sin auth
  const h = req.headers.authorization || "";
  const m = h.match(/^Bearer\s+(.+)$/i);
  if (!m) return _res.status(401).json({ ok:false, error:"AuthRequired" });
  try {
    const payload = jwt.verify(m[1], JWT_SECRET);
    req.user = { uid: payload.uid || payload.sub || "user", roles: payload.roles || [] };
    next();
  } catch (e) {
    _res.status(401).json({ ok:false, error:"InvalidToken" });
  }
}

// Utils
function buildKey(uid, filename) {
  const { y, m, d } = ymd();
  const id = crypto.randomBytes(6).toString("hex");
  return `users/${safe(uid||"anon")}/${y}/${m}/${d}/${Date.now()}_${id}_${safe(filename)}`;
}
function signWebhook(body) {
  if (!WEBHOOK_SECRET) return "";
  const h = crypto.createHmac("sha256", WEBHOOK_SECRET).update(JSON.stringify(body)).digest("hex");
  return `sha256=${h}`;
}
async function sendWebhook(event, payload) {
  if (!WEBHOOK_URL) return;
  const body = { event, payload, ts: Date.now() };
  await fetch(WEBHOOK_URL, {
    method:"POST",
    headers: { "Content-Type":"application/json", "X-Mixtli-Signature": signWebhook(body) },
    body: JSON.stringify(body)
  }).catch(()=>{});
}

app.get(["/","/version"], (_req,res) => res.json({ ok:true, name:"Mixtli Mini", version:"1.12.0" }));

app.get(["/salud","/api/health"], async (_req,res)=>{
  try {
    await s3.send(new HeadBucketCommand({ Bucket: S3_BUCKET }));
    res.json({ ok:true, version:"1.12.0", env:{ s3:Boolean(S3_BUCKET), maxSizeMB: MAX_SIZE_MB, allowedMime: ALLOWED_MIME, auth: Boolean(JWT_SECRET), db:"sqlite" } });
  } catch (e) {
    res.json({ ok:true, version:"1.12.0", warning:String(e) });
  }
});

// PRESIGN upload
app.post("/api/presign", requireAuth, async (req,res)=>{
  try {
    const { filename, key: providedKey, contentType, maxSizeMB } = req.body||{};
    const ct = contentType || "application/octet-stream";
    const limit = Math.min(Number(maxSizeMB||MAX_SIZE_MB), MAX_SIZE_MB);
    if (ALLOWED_MIME.length && !ALLOWED_MIME.includes(ct)) return res.status(415).json({ ok:false, error:"UnsupportedMediaType", message:`Content-Type no permitido: ${ct}` });
    let key = providedKey;
    if (!key) {
      if (!filename) return res.status(400).json({ ok:false, error:"BadRequest", message:"key requerido o filename" });
      key = buildKey(req.user?.uid, filename);
    }
    const put = new PutObjectCommand({ Bucket: S3_BUCKET, Key: key, ContentType: ct });
    const url = await getSignedUrl(s3, put, { expiresIn: 300 });
    res.json({ ok:true, url, key, bucket:S3_BUCKET, maxSizeBytes: Math.floor(limit*1024*1024) });
  } catch (e) { res.status(500).json({ ok:false, error:String(e) }); }
});

// COMMIT (DB + webhook)
app.post("/api/commit", requireAuth, async (req,res)=>{
  try {
    const { key, size, contentType, sha256 } = req.body||{};
    if (!key) return res.status(400).json({ ok:false, error:"BadRequest", message:"key requerido" });
    await db.run("INSERT OR IGNORE INTO files(uid,key,size,content_type,sha256) VALUES(?,?,?,?,?)",
      req.user?.uid || "anon", key, Number(size)||null, contentType||null, sha256||null);
    await sendWebhook("file.committed", { uid: req.user?.uid||"anon", key, size, contentType, sha256 });
    res.json({ ok:true, key });
  } catch (e) { res.status(500).json({ ok:false, error:String(e) }); }
});

// READLINK
app.get("/api/readlink", requireAuth, async (req,res)=>{
  try {
    const key = req.query.key;
    const ttl = Math.min(Number(req.query.ttl || DEFAULT_READ_TTL), 86400);
    if (!key) return res.status(400).json({ ok:false, error:"BadRequest", message:"key requerido" });
    const get = new GetObjectCommand({ Bucket:S3_BUCKET, Key: key });
    const url = await getSignedUrl(s3, get, { expiresIn: ttl });
    res.json({ ok:true, url, key, expiresIn: ttl });
  } catch (e) { res.status(500).json({ ok:false, error:String(e) }); }
});

// DELETE
app.delete("/api/file", requireAuth, async (req,res)=>{
  try {
    const key = req.query.key;
    if (!key) return res.status(400).json({ ok:false, error:"BadRequest", message:"key requerido" });
    await s3.send(new DeleteObjectCommand({ Bucket:S3_BUCKET, Key: key }));
    await db.run("UPDATE files SET deleted_at=CURRENT_TIMESTAMP WHERE key=?", key);
    await sendWebhook("file.deleted", { uid: req.user?.uid||"anon", key });
    res.json({ ok:true, deleted:key });
  } catch (e) { res.status(500).json({ ok:false, error:String(e) }); }
});

// LIST S3 (paginado nativo)
app.get("/api/list", requireAuth, async (req,res)=>{
  try {
    const Prefix = req.query.prefix || undefined;
    const ContinuationToken = req.query.token || undefined;
    const MaxKeys = Math.min(Number(req.query.max||"50"), 1000) || 50;
    const data = await s3.send(new ListObjectsV2Command({ Bucket:S3_BUCKET, MaxKeys, Prefix, ContinuationToken }));
    res.json({ ok:true, items:(data.Contents||[]).map(o=>({ key:o.Key, size:o.Size, lastModified:o.LastModified })), nextToken: data.IsTruncated ? (data.NextContinuationToken||null) : null });
  } catch (e) { res.status(500).json({ ok:false, error:String(e) }); }
});

// LIST DB
app.get("/api/listdb", requireAuth, async (req,res)=>{
  try {
    const uid = req.query.uid || req.user?.uid || "anon";
    const limit = Math.min(Number(req.query.limit||"50"), 200);
    const offset = Math.max(Number(req.query.offset||"0"), 0);
    const rows = await db.all("SELECT key,size,content_type,sha256,created_at,deleted_at FROM files WHERE uid=? ORDER BY created_at DESC LIMIT ? OFFSET ?", uid, limit, offset);
    res.json({ ok:true, items: rows });
  } catch (e) { res.status(500).json({ ok:false, error:String(e) }); }
});

// Multipart Init
app.post("/api/multipart/init", requireAuth, async (req,res)=>{
  try {
    const { filename, contentType } = req.body||{};
    if (!filename) return res.status(400).json({ ok:false, error:"BadRequest", message:"filename requerido" });
    const key = buildKey(req.user?.uid, filename);
    const cmd = new CreateMultipartUploadCommand({ Bucket:S3_BUCKET, Key:key, ContentType: contentType||"application/octet-stream" });
    const out = await s3.send(cmd);
    res.json({ ok:true, key, uploadId: out.UploadId });
  } catch (e) { res.status(500).json({ ok:false, error:String(e) }); }
});

// Multipart Sign Part
app.get("/api/multipart/sign", requireAuth, async (req,res)=>{
  try {
    const { key, uploadId, partNumber } = req.query;
    if (!key || !uploadId || !partNumber) return res.status(400).json({ ok:false, error:"BadRequest", message:"key, uploadId, partNumber requeridos" });
    const cmd = new UploadPartCommand({ Bucket:S3_BUCKET, Key:key, UploadId:uploadId, PartNumber:Number(partNumber) });
    const url = await getSignedUrl(s3, cmd, { expiresIn: 300 });
    res.json({ ok:true, url });
  } catch (e) { res.status(500).json({ ok:false, error:String(e) }); }
});

// Multipart Complete
app.post("/api/multipart/complete", requireAuth, async (req,res)=>{
  try {
    const { key, uploadId, parts } = req.body||{}; // parts: [{ETag, PartNumber}]
    if (!key || !uploadId || !Array.isArray(parts)) return res.status(400).json({ ok:false, error:"BadRequest", message:"key, uploadId, parts requeridos" });
    const cmd = new CompleteMultipartUploadCommand({ Bucket:S3_BUCKET, Key:key, UploadId:uploadId, MultipartUpload:{ Parts: parts } });
    await s3.send(cmd);
    res.json({ ok:true, key });
  } catch (e) { res.status(500).json({ ok:false, error:String(e) }); }
});

// Multipart Abort
app.post("/api/multipart/abort", requireAuth, async (req,res)=>{
  try {
    const { key, uploadId } = req.body||{};
    if (!key || !uploadId) return res.status(400).json({ ok:false, error:"BadRequest" });
    await s3.send(new AbortMultipartUploadCommand({ Bucket:S3_BUCKET, Key:key, UploadId:uploadId }));
    res.json({ ok:true, aborted:true });
  } catch (e) { res.status(500).json({ ok:false, error:String(e) }); }
});

// Thumbnail: descarga con readlink, redimensiona, sube a thumbs/{key}.jpg
app.post("/api/thumbnail", requireAuth, async (req,res)=>{
  try {
    const { key, width=480 } = req.body||{};
    if (!key) return res.status(400).json({ ok:false, error:"BadRequest", message:"key requerido" });
    const get = new GetObjectCommand({ Bucket:S3_BUCKET, Key:key });
    const url = await getSignedUrl(s3, get, { expiresIn: 300 });
    const buf = await (await fetch(url)).arrayBuffer();
    const out = await sharp(Buffer.from(buf)).rotate().resize(Number(width)).jpeg({ quality:80 }).toBuffer();
    const tkey = `thumbs/${key}.jpg`;
    await s3.send(new PutObjectCommand({ Bucket:S3_BUCKET, Key:tkey, Body: out, ContentType: "image/jpeg" }));
    res.json({ ok:true, thumbnailKey: tkey });
  } catch (e) { res.status(500).json({ ok:false, error:String(e) }); }
});

// TTL cleanup (manual endpoint)
app.post("/api/admin/expire", requireAuth, async (req,res)=>{
  try {
    const days = Math.max(Number(req.body?.days||"0"), 0);
    if (!days) return res.status(400).json({ ok:false, error:"BadRequest", message:"days requerido" });
    const rows = await db.all("SELECT key FROM files WHERE deleted_at IS NULL AND created_at <= datetime('now','-" + days + " days')");
    let deleted=0;
    for (const r of rows) {
      try { await s3.send(new DeleteObjectCommand({ Bucket:S3_BUCKET, Key:r.key })); deleted++; await db.run("UPDATE files SET deleted_at=CURRENT_TIMESTAMP WHERE key=?", r.key); } catch {}
    }
    await sendWebhook("admin.expire", { days, deleted });
    res.json({ ok:true, deleted });
  } catch (e) { res.status(500).json({ ok:false, error:String(e) }); }
});

app.use((req,res)=> res.status(404).json({ ok:false, error:"Not Found", path:req.path }));

app.listen(PORT, ()=> console.log(`Mixtli Mini 1.12.0 on :${PORT}`));
