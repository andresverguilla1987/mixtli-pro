import express from "express";
import morgan from "morgan";
import cors from "cors";
import { buildS3, listAll, presignUpload, presignGet, headBucketSafe } from "./utils/s3.js";

const app = express();
app.use(express.json({ limit: "2mb" }));
app.use(morgan("tiny"));

const allowed = process.env.ALLOWED_ORIGINS
  ? JSON.parse(process.env.ALLOWED_ORIGINS)
  : ["*"];

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowed.includes("*") || allowed.includes(origin)) return cb(null, true);
    return cb(null, false);
  },
  credentials: true
}));

app.get("/", (_, res) => {
  res.status(200).send("Mixtli API v1.11.0");
});

app.get("/salud", (_, res) => res.status(200).json({ ok: true }));

app.get("/diag", async (req, res) => {
  const env = {
    haveBucket: !!process.env.S3_BUCKET,
    haveAccessKeyId: !!process.env.AWS_ACCESS_KEY_ID,
    haveSecretAccessKey: !!process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION || "",
    endpoint: process.env.S3_ENDPOINT || "",
    forcePathStyle: String(process.env.S3_FORCE_PATH_STYLE || ""),
    prefix: process.env.S3_PREFIX || "",
  };
  const { client, bucket } = buildS3();
  const bucketAccess = await headBucketSafe(client, bucket);
  res.json({ env, bucket, bucketAccess });
});

// List objects
app.get("/api/list", async (req, res) => {
  try {
    const limit = Math.max(1, Math.min(2000, parseInt(req.query.limit || "160", 10)));
    const prefix = process.env.S3_PREFIX || "";
    const { client, bucket } = buildS3();
    if (!bucket) return res.status(500).json({ error: "ConfigError", message: "S3_BUCKET no está definido" });
    const items = await listAll({ client, bucket, prefix, maxKeys: limit });
    res.json({ items });
  } catch (err) {
    console.error("[list] ERROR", err);
    res.status(500).json({
      error: err?.name || "ListError",
      message: err?.message || "Fallo listando objetos",
    });
  }
});

// Presign upload
app.post("/api/presign", async (req, res) => {
  try {
    const { key } = req.body;
    if (!key || typeof key !== "string") {
      return res.status(400).json({ error: "BadRequest", message: "Parámetro 'key' requerido" });
    }
    const { client, bucket } = buildS3();
    if (!bucket) return res.status(500).json({ error: "ConfigError", message: "S3_BUCKET no está definido" });

    const fullKey = (process.env.S3_PREFIX || "") + key.replace(/^\/+/, "");
    const out = await presignUpload({ client, bucket, key: fullKey, maxMb: 500 });
    res.json(out);
  } catch (err) {
    // Señal clara cuando credenciales están vacías/invalidas
    const code = (err?.name === "CredentialsProviderError" || /credential/i.test(err?.message||"")) ? 500 : 500;
    console.error("[presign] ERROR", err);
    res.status(code).json({
      error: "PresignError",
      message: err?.message || "Fallo generando presign",
      hint: "Revisa AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY / S3_BUCKET / S3_ENDPOINT / S3_FORCE_PATH_STYLE",
    });
  }
});

// Presign GET (proxy)
app.get("/files/:key", async (req, res) => {
  try {
    const decoded = decodeURIComponent(req.params.key);
    const fullKey = (process.env.S3_PREFIX || "") + decoded;
    const { client, bucket } = buildS3();
    if (!bucket) return res.status(500).send("S3_BUCKET no definido");
    const url = await presignGet({ client, bucket, key: fullKey, expires: 3600 });
    res.redirect(302, url);
  } catch (err) {
    console.error("[files] ERROR", err);
    res.status(404).send("No encontrado");
  }
});

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 10000;
app.listen(PORT, () => {
  console.log(`Mixtli API v1.11.0 on :${PORT}`);
});