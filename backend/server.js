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

app.get("/salud", (_, res) => res.json({ status: "ok", driver: "R2" }));

app.post("/api/upload/presign", async (req, res) => {
  try {
    const { key, contentType } = req.body || {};
    if (!key || !contentType) return res.status(400).json({ error: "key y contentType requeridos" });
    const cmd = new PutObjectCommand({ Bucket: BUCKET, Key: key, ContentType: contentType });
    const url = await getSignedUrl(r2, cmd, { expiresIn: 60 });
    res.json({ url, method: "PUT", headers: { "Content-Type": contentType }, key });
  } catch (err) {
    log.error({ err }, "presign upload failed");
    res.status(500).json({ error: "presign upload failed" });
  }
});

app.post("/api/download/presign", async (req, res) => {
  try {
    const { key, expiresIn = 600 } = req.body || {};
    if (!key) return res.status(400).json({ error: "key requerido" });
    const cmd = new GetObjectCommand({ Bucket: BUCKET, Key: key });
    const url = await getSignedUrl(r2, cmd, { expiresIn: Math.min(3600, Math.max(60, +expiresIn || 600)) });
    res.json({ url, method: "GET", key });
  } catch (err) {
    log.error({ err }, "presign download failed");
    res.status(500).json({ error: "presign download failed" });
  }
});

const port = process.env.PORT || 10000;
app.listen(port, () => log.info({ port, driver: "R2", msg: "up" }));
