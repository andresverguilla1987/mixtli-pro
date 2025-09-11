import express from "express";
import crypto from "crypto";
import { S3Client, PutObjectCommand, GetObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const {
  PORT = process.env.PORT || 10000,
  R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY,
  R2_BUCKET,
  R2_ACCOUNT_ID,
  PRESIGN_EXPIRES = 3600,
  ALLOWED_ORIGINS = "http://localhost:5173,https://*.netlify.app",
  MAX_UPLOAD_MB = 50,
  ALLOWED_MIME_PREFIXES = "image/,application/pdf"
} = process.env;

const PUBLIC_BASE = (process.env.PUBLIC_BASE_URL || "").trim().replace(/\/$/, "");

const app = express();
app.use(express.json({limit:"2mb"}));

const allowList = ALLOWED_ORIGINS.split(",").map(s => s.trim()).filter(Boolean);
app.use((req,res,next)=>{
  const origin = req.headers.origin || "";
  const ok = allowList.some(pat => pat.includes("*")
    ? new RegExp("^" + pat.replace(/[.+?^${}()|[\]\\]/g,"\\$&").replace("\*",".*") + "$").test(origin)
    : pat === origin
  );
  if (ok) res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Vary","Origin");
  res.setHeader("Access-Control-Allow-Methods","GET,POST,PUT,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers","Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

// R2 client
const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: R2_ACCESS_KEY_ID || "", secretAccessKey: R2_SECRET_ACCESS_KEY || "" }
});

function makeKey(name="file.bin"){
  const ts = Date.now();
  const rnd = crypto.randomBytes(3).toString("hex");
  const base = (name||"file.bin").replace(/[^a-zA-Z0-9._-]/g,"_");
  return `${ts}-${rnd}-${base}`;
}

app.get("/health", (req,res)=> res.json({ok:true, time:new Date().toISOString()}));
app.get("/version", (req,res)=> res.json({name:"mixtli", version:"autofix-1", node:process.version}));
app.get("/diagnostics", (req,res)=>{
  res.json({
    publicBase: PUBLIC_BASE || null,
    corsAllowList: allowList,
    bucket: R2_BUCKET || null,
    account: R2_ACCOUNT_ID ? R2_ACCOUNT_ID.slice(0,6)+"..." : null,
    maxUploadMB: Number(MAX_UPLOAD_MB),
    allowedMimePrefixes: ALLOWED_MIME_PREFIXES.split(",").map(s=>s.trim())
  });
});

app.post("/presign", async (req,res)=>{
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

    res.json({ key: Key, url, method:"PUT", headers:{"Content-Type":contentType}, publicUrl, expiresIn:Number(PRESIGN_EXPIRES) });
  }catch(err){
    console.error("presign error:", err);
    res.status(500).json({ error: String(err?.message || err) });
  }
});

app.get("/download/:key", async (req,res)=>{
  try{
    const Key = req.params.key;
    const head = await s3.send(new HeadObjectCommand({Bucket:R2_BUCKET, Key}));
    res.setHeader("Content-Type", head.ContentType || "application/octet-stream");
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    const obj = await s3.send(new GetObjectCommand({ Bucket:R2_BUCKET, Key }));
    obj.Body.pipe(res);
  }catch(err){
    res.status(404).json({ error:"Not found" });
  }
});

app.listen(PORT, ()=>{
  console.log("PUBLIC_BASE_URL ->", PUBLIC_BASE || "(NOT SET)");
  console.log("Mixtli API on :" + PORT);
});
