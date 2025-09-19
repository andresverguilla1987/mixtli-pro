
import express from "express";
import morgan from "morgan";
import { config as dotenv } from "dotenv";
import crypto from "crypto";
import { S3Client, HeadBucketCommand, ListObjectsV2Command, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

dotenv();

const PORT = process.env.PORT || 10000;
const S3_ENDPOINT = process.env.S3_ENDPOINT;
const S3_REGION = process.env.S3_REGION || "auto";
const S3_BUCKET = process.env.S3_BUCKET;
const S3_ACCESS_KEY_ID = process.env.S3_ACCESS_KEY_ID;
const S3_SECRET_ACCESS_KEY = process.env.S3_SECRET_ACCESS_KEY;
const S3_FORCE_PATH_STYLE = String(process.env.S3_FORCE_PATH_STYLE || "true") === "true";
const ALLOWED_ORIGINS = (() => { try { return JSON.parse(process.env.ALLOWED_ORIGINS || "[]"); } catch { return []; } })();

// Configuración de validación
const MAX_SIZE_MB = Number(process.env.MAX_SIZE_MB || 50);  // límite server-side para presign
const ALLOWED_MIME = (() => {
  const raw = process.env.ALLOWED_MIME || "image/jpeg,image/png,image/webp,video/mp4,application/pdf";
  return raw.split(",").map(s => s.trim()).filter(Boolean);
})();

const app = express();
app.use(express.json({ limit: "1mb" }));
app.use(morgan("dev"));

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
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-mixtli-token");
  res.status(204).end();
});

const s3 = new S3Client({
  region: S3_REGION,
  endpoint: S3_ENDPOINT,
  forcePathStyle: S3_FORCE_PATH_STYLE,
  credentials: { accessKeyId: S3_ACCESS_KEY_ID, secretAccessKey: S3_SECRET_ACCESS_KEY }
});

function safe(s) { return String(s||"").replace(/[^a-zA-Z0-9._-]/g, "_"); }
function ymd(date=new Date()) {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth()+1).padStart(2,"0");
  const d = String(date.getUTCDate()).padStart(2,"0");
  return {y,m,d};
}

app.get(["/","/version"], (req, res) => {
  res.json({ ok:true, name:"Mixtli Mini", version:"1.11.0" });
});

app.get(["/salud","/api/health"], async (req, res) => {
  try {
    if (S3_BUCKET && S3_ACCESS_KEY_ID && S3_SECRET_ACCESS_KEY && S3_ENDPOINT) {
      await s3.send(new HeadBucketCommand({ Bucket: S3_BUCKET }));
    }
    res.json({ ok:true, name:"Mixtli Mini", version:"1.11.0",
      env:{ s3Configured:Boolean(S3_BUCKET && S3_ENDPOINT && S3_ACCESS_KEY_ID && S3_SECRET_ACCESS_KEY), region:S3_REGION, pathStyle:S3_FORCE_PATH_STYLE, maxSizeMB: MAX_SIZE_MB, allowedMime: ALLOWED_MIME } });
  } catch (err) {
    res.status(200).json({ ok:true, name:"Mixtli Mini", version:"1.11.0", warning:"S3 check failed", error:String(err) });
  }
});

// Listado con paginación
app.get("/api/list", async (req, res) => {
  try {
    if (!S3_BUCKET) return res.status(400).json({ ok:false, error:"S3_BUCKET missing" });
    const Prefix = req.query.prefix || undefined;
    const ContinuationToken = req.query.token || undefined;
    const MaxKeys = Math.min(Number(req.query.max||"50"), 1000) || 50;
    const data = await s3.send(new ListObjectsV2Command({ Bucket: S3_BUCKET, MaxKeys, Prefix, ContinuationToken }));
    res.json({
      ok:true,
      items:(data.Contents||[]).map(o=>({ key:o.Key, size:o.Size, lastModified:o.LastModified })),
      nextToken: data.IsTruncated ? (data.NextContinuationToken || null) : null,
      keyCount: data.KeyCount
    });
  } catch (err) {
    res.status(500).json({ ok:false, error:String(err) });
  }
});

// Presign de subida con validación y carpetas users/{uid}/YYYY/MM/DD/
app.post("/api/presign", async (req, res) => {
  try {
    const { filename, key: providedKey, contentType, maxSizeMB, uid } = req.body || {};
    const limitMB = Math.min(Number(maxSizeMB || MAX_SIZE_MB), MAX_SIZE_MB);
    const ct = contentType || "application/octet-stream";
    if (ALLOWED_MIME.length && !ALLOWED_MIME.includes(ct)) {
      return res.status(400).json({ ok:false, error:"UnsupportedMediaType", message:`Content-Type no permitido: ${ct}` });
    }
    let key = providedKey;
    if (!key) {
      if (!filename) return res.status(400).json({ ok:false, error:"BadRequest", message:"key requerido o filename" });
      const id = crypto.randomBytes(6).toString("hex");
      const {y,m,d} = ymd();
      const base = `users/${safe(uid||"anon")}/${y}/${m}/${d}`;
      key = `${base}/${Date.now()}_${id}_${safe(filename)}`;
    }
    if (!S3_BUCKET) return res.status(400).json({ ok:false, error:"S3_BUCKET missing" });

    const putCmd = new PutObjectCommand({ Bucket: S3_BUCKET, Key: key, ContentType: ct });
    const url = await getSignedUrl(s3, putCmd, { expiresIn: 300 });
    res.json({ ok:true, url, key, bucket:S3_BUCKET, expiresIn:300, maxSizeBytes: Math.floor(limitMB*1024*1024) });
  } catch (err) {
    res.status(500).json({ ok:false, error:String(err) });
  }
});

// Link de lectura firmado
app.get("/api/readlink", async (req, res) => {
  try {
    const key = req.query.key;
    const ttl = Math.min(Number(req.query.ttl || "300"), 86400); // hasta 24h
    if (!key) return res.status(400).json({ ok:false, error:"BadRequest", message:"key requerido" });
    if (!S3_BUCKET) return res.status(400).json({ ok:false, error:"S3_BUCKET missing" });
    const getCmd = new GetObjectCommand({ Bucket: S3_BUCKET, Key: key });
    const url = await getSignedUrl(s3, getCmd, { expiresIn: ttl });
    res.json({ ok:true, url, key, expiresIn: ttl });
  } catch (err) {
    res.status(500).json({ ok:false, error:String(err) });
  }
});

// Borrado
app.delete("/api/file", async (req, res) => {
  try {
    const key = req.query.key || (req.body && req.body.key);
    if (!key) return res.status(400).json({ ok:false, error:"BadRequest", message:"key requerido" });
    if (!S3_BUCKET) return res.status(400).json({ ok:false, error:"S3_BUCKET missing" });
    await s3.send(new DeleteObjectCommand({ Bucket: S3_BUCKET, Key: key }));
    res.json({ ok:true, deleted: key });
  } catch (err) {
    res.status(500).json({ ok:false, error:String(err) });
  }
});

app.use((req, res) => {
  res.status(404).json({ ok:false, error:"Not Found", path:req.path });
});

app.listen(PORT, () => console.log(`Mixtli Mini 1.11.0 on :${PORT}`));
