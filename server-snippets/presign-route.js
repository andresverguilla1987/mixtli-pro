// server-snippets/presign-route.js
import express from "express";
import { buildS3, listAll, presignUpload, presignGet, headBucketSafe } from "../utils/s3.js";

const BUCKET = process.env.S3_BUCKET;
if (!BUCKET) {
  console.warn("[Mixtli] WARNING: S3_BUCKET is not set. /api/list and /api/presign will fail until it's configured.");
}
const { client, cfg } = buildS3();

export const healthRouter = express.Router();
export const presignRouter = express.Router();
export const filesRouter = express.Router();

healthRouter.get("/salud", (_req, res) => res.status(200).send("ok"));

healthRouter.get("/api/health", async (_req, res) => {
  const head = BUCKET ? await headBucketSafe({ client, bucket: BUCKET }) : { ok: false, code: "NoBucket" };
  res.json({
    name: "mixtli-api",
    bucket: BUCKET || null,
    s3: {
      region: cfg.region,
      endpoint: cfg.endpoint || null,
      forcePathStyle: !!cfg.forcePathStyle,
      hasCredentials: !!cfg.credentials
    },
    bucketReachable: head
  });
});

presignRouter.post("/api/presign", express.json(), async (req, res) => {
  try {
    const body = req.body || {};
    const key = body.key || body.name || body.filename;
    const contentType = body.contentType || body.type || body.mimeType || "application/octet-stream";
    if (!BUCKET) return res.status(400).json({ error: "NO_BUCKET", message: "Configure S3_BUCKET" });
    if (!key) return res.status(400).json({ error: "BAD_REQUEST", message: "Missing key" });

    // Normalize key to avoid accidental '//' and trim leading slash
    const normKey = String(key).replace(/^\/+/, "").replace(/\/{2,}/g, "/");

    const signed = await presignUpload({ client, bucket: BUCKET, key: normKey, contentType });
    return res.json({ ok: true, bucket: BUCKET, key: normKey, ...signed });
  } catch (err) {
    console.error("[/api/presign] error:", err);
    const code = err?.name || "PresignError";
    return res.status(500).json({ error: code, message: String(err) });
  }
});

presignRouter.get("/api/list", async (req, res) => {
  try {
    if (!BUCKET) return res.status(400).json({ error: "NO_BUCKET", message: "Configure S3_BUCKET" });
    const limit = Math.max(1, Math.min(2000, parseInt(req.query.limit || "200", 10) || 200));
    const prefix = (req.query.prefix || "").toString();
    const resp = await listAll({ client, bucket: BUCKET, prefix, limit });
    if (!resp.ok) {
      console.error("[/api/list] error:", resp);
      return res.status(500).json({ error: resp.code || "ListError", message: resp.detail || "list failed" });
    }
    return res.json({ items: resp.items });
  } catch (err) {
    console.error("[/api/list] error:", err);
    const code = err?.name || "ListError";
    return res.status(500).json({ error: code, message: String(err) });
  }
});

filesRouter.get("/files/:key", async (req, res) => {
  try {
    if (!BUCKET) return res.status(400).send("NO_BUCKET");
    const raw = req.params.key || "";
    const key = decodeURIComponent(raw);
    const link = await presignGet({ client, bucket: BUCKET, key, expiresSeconds: 3600 });
    return res.redirect(302, link.url);
  } catch (err) {
    console.error("[/files/:key] error:", err);
    return res.status(404).send("Not Found");
  }
});