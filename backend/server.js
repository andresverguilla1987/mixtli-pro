import express from "express";
import bodyParser from "body-parser";
import pino from "pino";
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const log = pino();
const app = express();
app.use(bodyParser.json({ limit: "10mb" }));

const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
  forcePathStyle: true,
});

const BUCKET = process.env.R2_BUCKET;

app.get("/api/health", (_, res) => res.json({ status: "ok", driver: "R2" }));

// NO ContentType in signature
app.post("/upload/presign", async (req, res) => {
  try {
    const { filename } = req.body || {};
    if (!filename) return res.status(400).json({ error: "filename requerido" });
    const safe = String(filename).replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 180);
    const key = `u/${Date.now()}-${Math.random().toString(36).slice(2,8)}-${safe}`;
    const cmd = new PutObjectCommand({ Bucket: BUCKET, Key: key });
    const url = await getSignedUrl(r2, cmd, { expiresIn: 60 });
    res.json({ putUrl: url, uploadId: key, headers: {} });
  } catch (e) {
    log.error({ e }, "presign failed");
    res.status(500).json({ error: "presign failed" });
  }
});

app.post("/upload/complete", async (req, res) => {
  const { uploadId } = req.body || {};
  if (!uploadId) return res.status(400).json({ error: "uploadId requerido" });
  res.json({ ok: true, uploadId });
});

app.get("/upload/:id/link", async (req, res) => {
  try {
    const key = req.params.id;
    const cmd = new GetObjectCommand({ Bucket: BUCKET, Key: key });
    const url = await getSignedUrl(r2, cmd, { expiresIn: 600 });
    res.json({ url });
  } catch (e) {
    res.status(500).json({ error: "link failed" });
  }
});

const port = process.env.PORT || 10000;
app.listen(port, () => log.info({ port, driver: "R2", msg: "up" }));
