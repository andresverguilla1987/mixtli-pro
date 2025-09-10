import express from "express";
import crypto from "crypto";
import { S3Client, PutObjectCommand, GetObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// ===== Env & defaults =====
const {
  PORT = process.env.PORT || 10000,
  R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY,
  R2_BUCKET,
  R2_ACCOUNT_ID,
  PRESIGN_EXPIRES = 3600,
  ALLOWED_ORIGINS = "http://localhost:5173,https://*.netlify.app",
  MAX_UPLOAD_MB = 50, // límite suave en el presign
  ALLOWED_MIME_PREFIXES = "image/,application/pdf" // por defecto: imágenes y PDFs
} = process.env;

// Normaliza y LOGUEA PUBLIC_BASE_URL
const PUBLIC_BASE = (process.env.PUBLIC_BASE_URL || "").trim().replace(/\/$/, "");
console.log("PUBLIC_BASE_URL ->", PUBLIC_BASE || "(NOT SET)");
console.log("MAX_UPLOAD_MB ->", MAX_UPLOAD_MB);
console.log("ALLOWED_MIME_PREFIXES ->", ALLOWED_MIME_PREFIXES);

// Validación mínima de credenciales
if (!R2_ACCOUNT_ID || !R2_BUCKET || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
  console.error("Faltan env vars: R2_ACCOUNT_ID, R2_BUCKET, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY");
}

const R2_ENDPOINT = `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;

// ===== App =====
const app = express();
app.use(express.json({limit:"2mb"})); // presign payload, no archivo

// CORS seguro con soporte wildcard
const allowList = ALLOWED_ORIGINS.split(",").map(s => s.trim()).filter(Boolean);
app.use((req, res, next) => {
  const origin = req.headers.origin || "";
  const ok = allowList.some(pat => {
    if (pat.includes("*")) {
      const re = new RegExp("^" + pat.replace(/[.+?^${}()|[\]\\]/g,"\\$&").replace("\\*",".*") + "$");
      return re.test(origin);
    }
    return pat === origin;
  });
  if (ok) res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Vary","Origin");
  res.setHeader("Access-Control-Allow-Methods","GET,POST,PUT,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers","Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

// S3/R2 client
const s3 = new S3Client({
  region: "auto",
  endpoint: R2_ENDPOINT,
  credentials: { accessKeyId: R2_ACCESS_KEY_ID || "", secretAccessKey: R2_SECRET_ACCESS_KEY || "" }
});

function makeKey(name="file.bin"){
  const ts = Date.now();
  const rnd = crypto.randomBytes(3).toString("hex");
  const base = (name || "file.bin").replace(/[^a-zA-Z0-9._-]/g,"_");
  return `${ts}-${rnd}-${base}`;
}

app.get("/health", (req,res)=> res.json({ok:true, time:new Date().toISOString()}));
app.get("/version", (req,res)=> res.json({name:"mixtli", version:"ultimate-1", node:process.version}));

// POST /presign { filename, contentType, size }
app.post("/presign", async (req, res) => {
  try{
    const { filename="file.bin", contentType="application/octet-stream", size=0 } = req.body || {};
    const maxBytes = Number(MAX_UPLOAD_MB) * 1024 * 1024;
    const allowedPrefixes = ALLOWED_MIME_PREFIXES.split(",").map(s=>s.trim()).filter(Boolean);

    if (size && maxBytes && Number(size) > maxBytes){
      return res.status(413).json({ error: `Archivo demasiado grande. Máximo ${MAX_UPLOAD_MB} MB` });
    }
    if (allowedPrefixes.length && !allowedPrefixes.some(p => contentType.startsWith(p))){
      return res.status(415).json({ error: `Tipo no permitido (${contentType}). Permitidos: ${allowedPrefixes.join(", ")}` });
    }

    const Key = makeKey(filename);
    const putCmd = new PutObjectCommand({ Bucket: R2_BUCKET, Key, ContentType: contentType });
    const url = await getSignedUrl(s3, putCmd, { expiresIn: Number(PRESIGN_EXPIRES) });
    const publicUrl = PUBLIC_BASE ? `${PUBLIC_BASE}/${encodeURIComponent(Key)}` : null;

    res.json({
      key: Key,
      url,
      method: "PUT",
      headers: { "Content-Type": contentType },
      publicUrl,
      expiresIn: Number(PRESIGN_EXPIRES),
    });
  }catch(err){
    console.error("presign error:", err);
    res.status(500).json({ error: String(err?.message || err) });
  }
});

// GET /download/:key  -> proxy de lectura
app.get("/download/:key", async (req, res) => {
  try{
    const Key = req.params.key;
    const head = await s3.send(new HeadObjectCommand({Bucket:R2_BUCKET, Key}));
    res.setHeader("Content-Type", head.ContentType || "application/octet-stream");
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    const getCmd = new GetObjectCommand({ Bucket: R2_BUCKET, Key });
    const obj = await s3.send(getCmd);
    obj.Body.pipe(res);
  }catch(err){
    res.status(404).json({ error: "Not found" });
  }
});

app.listen(PORT, ()=> console.log("Mixtli API on :" + PORT));
