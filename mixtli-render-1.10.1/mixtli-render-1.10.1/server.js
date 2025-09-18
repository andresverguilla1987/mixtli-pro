import express from "express";
import morgan from "morgan";
import cors from "cors";
import { config as dotenv } from "dotenv";
import crypto from "crypto";
import { S3Client, HeadBucketCommand, ListObjectsV2Command, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

dotenv();

// ---- Env ----
const PORT = process.env.PORT || 10000;
const NODE_ENV = process.env.NODE_ENV || "production";

// IMPORTANT: use S3_* names even for R2
const S3_ENDPOINT = process.env.S3_ENDPOINT;             // e.g. https://<accountid>.r2.cloudflarestorage.com
const S3_REGION = process.env.S3_REGION || "auto";       // for R2 use "auto"
const S3_BUCKET = process.env.S3_BUCKET;
const S3_ACCESS_KEY_ID = process.env.S3_ACCESS_KEY_ID;
const S3_SECRET_ACCESS_KEY = process.env.S3_SECRET_ACCESS_KEY;
const S3_FORCE_PATH_STYLE = String(process.env.S3_FORCE_PATH_STYLE || "true") === "true"; // R2 needs true

// CORS
const ALLOWED_ORIGINS = (() => {
  try {
    return JSON.parse(process.env.ALLOWED_ORIGINS || "[]");
  } catch (e) {
    return [];
  }
})();

// ---- App ----
const app = express();
app.use(express.json({ limit: "1mb" }));
app.use(morgan("dev"));

// Strict CORS: only allow configured origins
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (!origin || ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin || "*");
    res.setHeader("Vary", "Origin");
    return next();
  }
  // Block other origins
  return res.status(403).json({ ok: false, error: "CORS: Origin not allowed", origin });
});

// Preflight for API + /files
app.options(["/api/*", "/files/*", "/salud", "/api/health"], (req, res) => {
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-mixtli-token");
  res.status(204).end();
});

// ---- S3 client ----
const s3 = new S3Client({
  region: S3_REGION,
  endpoint: S3_ENDPOINT,
  forcePathStyle: S3_FORCE_PATH_STYLE,
  credentials: {
    accessKeyId: S3_ACCESS_KEY_ID,
    secretAccessKey: S3_SECRET_ACCESS_KEY
  }
});

// ---- Helpers ----
function safeKey(s) {
  // basic normalization
  return s.replace(/[^a-zA-Z0-9._-]/g, "_");
}

// ---- Health ----
app.get(["/salud", "/api/health"], async (req, res) => {
  try {
    // light bucket check if credentials are present
    if (S3_BUCKET && S3_ACCESS_KEY_ID && S3_SECRET_ACCESS_KEY && S3_ENDPOINT) {
      await s3.send(new HeadBucketCommand({ Bucket: S3_BUCKET }));
    }
    res.json({
      ok: true,
      name: "Mixtli Mini",
      version: "1.10.1",
      env: {
        node: process.version,
        port: PORT,
        s3Configured: Boolean(S3_BUCKET && S3_ENDPOINT && S3_ACCESS_KEY_ID && S3_SECRET_ACCESS_KEY),
        region: S3_REGION,
        pathStyle: S3_FORCE_PATH_STYLE
      }
    });
  } catch (err) {
    res.status(200).json({
      ok: true,
      name: "Mixtli Mini",
      version: "1.10.1",
      warning: "S3 check failed (credentials or bucket may be missing)",
      error: String(err)
    });
  }
});

// ---- List (optional helper) ----
app.get("/api/list", async (req, res) => {
  try {
    if (!S3_BUCKET) return res.status(400).json({ ok: false, error: "S3_BUCKET missing" });
    const data = await s3.send(new ListObjectsV2Command({ Bucket: S3_BUCKET, MaxKeys: 50 }));
    res.json({ ok: true, items: (data.Contents || []).map(o => ({ key: o.Key, size: o.Size, lastModified: o.LastModified })) });
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) });
  }
});

// ---- Presign upload ----
// Body: { filename, contentType, maxSizeMB? }
app.post("/api/presign", async (req, res) => {
  try {
    const { filename, contentType, maxSizeMB = 50 } = req.body || {};
    if (!filename) return res.status(400).json({ ok: false, error: "filename required" });
    if (!S3_BUCKET) return res.status(400).json({ ok: false, error: "S3_BUCKET missing" });

    const key = `${Date.now()}_${crypto.randomBytes(6).toString("hex")}_${safeKey(filename)}`;

    // Prepare a PutObject presign
    const putCmd = new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: key,
      ContentType: contentType || "application/octet-stream"
    });

    const url = await getSignedUrl(s3, putCmd, { expiresIn: 60 * 5 }); // 5 minutes

    res.json({ ok: true, url, key, bucket: S3_BUCKET, expiresIn: 300, maxSizeBytes: Math.floor(maxSizeMB * 1024 * 1024) });
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) });
  }
});

// ---- Static (for local demo only) ----
app.get("/", (req, res) => {
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.end("Mixtli Mini v1.10.1 · OK");
});

app.listen(PORT, () => {
  console.log(`Mixtli Mini on :${PORT}`);
});
