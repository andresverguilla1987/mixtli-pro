import express from "express";
import crypto from "crypto";
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// ===== Env vars =====
const {
  PORT = process.env.PORT || 10000,
  R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY,
  R2_BUCKET,
  R2_ACCOUNT_ID,
  PRESIGN_EXPIRES = 3600,
  ALLOWED_ORIGINS = "http://localhost:5173,https://*.netlify.app"
} = process.env;

// Normaliza y LOGUEA PUBLIC_BASE_URL
const PUBLIC_BASE = (process.env.PUBLIC_BASE_URL || "").trim().replace(/\/$/, "");
console.log("PUBLIC_BASE_URL ->", PUBLIC_BASE || "(NOT SET)");

// Validación mínima
if (!R2_ACCOUNT_ID || !R2_BUCKET || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
  console.error("Faltan env vars: R2_ACCOUNT_ID, R2_BUCKET, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY");
}

const R2_ENDPOINT = `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;

// ===== App =====
const app = express();
app.use(express.json({limit:"25mb"}));

// CORS seguro
const allowList = ALLOWED_ORIGINS.split(",").map(s => s.trim()).filter(Boolean);
app.use((req, res, next) => {
  const origin = req.headers.origin || "";
  const ok = allowList.some(pat => {
    if (pat.includes("*")) {
      const re = new RegExp("^" + pat.replace(/[.+?^${}()|[\]\\]/g,"\\$&").replace("\*",".*") + "$");
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
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID || "",
    secretAccessKey: R2_SECRET_ACCESS_KEY || ""
  }
});

function makeKey(name="file.bin"){
  const ts = Date.now();
  const rnd = crypto.randomBytes(3).toString("hex");
  const base = (name || "file.bin").replace(/[^a-zA-Z0-9._-]/g,"_");
  return `${ts}-${rnd}-${base}`;
}

app.get("/health", (req,res)=> res.json({ok:true, time:new Date().toISOString()}));

app.post("/presign", async (req, res) => {
  try{
    const { filename = "file.bin", contentType = "application/octet-stream" } = req.body || {};
    const Key = makeKey(filename);

    const putCmd = new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key,
      ContentType: contentType
    });
    const url = await getSignedUrl(s3, putCmd, { expiresIn: Number(PRESIGN_EXPIRES) });

    const publicUrl = PUBLIC_BASE ? `${PUBLIC_BASE}/${encodeURIComponent(Key)}` : null;

    res.json({
      key: Key,
      url,
      method: "PUT",
      headers: { "Content-Type": contentType },
      publicUrl
    });
  }catch(err){
    console.error("presign error:", err);
    res.status(500).json({ error: String(err?.message || err) });
  }
});

// Proxy opcional por si el público no está habilitado
app.get("/download/:key", async (req, res) => {
  try{
    const Key = req.params.key;
    const getCmd = new GetObjectCommand({ Bucket: R2_BUCKET, Key });
    const obj = await s3.send(getCmd);
    res.setHeader("Content-Type", obj.ContentType || "application/octet-stream");
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    obj.Body.pipe(res);
  }catch(err){
    res.status(404).json({ error: "Not found" });
  }
});

app.listen(PORT, ()=> console.log("Mixtli API on :" + PORT));
