import express from "express";
import cors from "cors";
import morgan from "morgan";
import { s3Client, bucket, cfg, ensureBucketAccess, listKeys, streamGetObject, presignPost } from "./utils/s3.js";

const app = express();
app.use(express.json({ limit: "10mb" }));
app.use(morgan("dev"));

const allowed = cfg.ALLOWED_ORIGINS;
if (allowed && allowed.length) {
  app.use(cors({
    origin: function (origin, cb) {
      if (!origin || allowed.includes(origin)) return cb(null, true);
      return cb(new Error("CORS not allowed for origin: " + origin));
    },
    credentials: true
  }));
} else {
  app.use(cors());
}

app.get("/", (_req, res) => res.status(200).send("Mixtli API v1.11.0"));

app.get("/salud", async (_req, res) => {
  res.json({ ok: true, name: "Mixtli", version: "1.11.0", time: new Date().toISOString() });
});

app.get("/diag", async (_req, res) => {
  const diag = {
    NODE_VERSION: process.version,
    bucket,
    endpoint: cfg.S3_ENDPOINT || "(aws default)",
    region: cfg.AWS_REGION,
    forcePathStyle: cfg.S3_FORCE_PATH_STYLE,
    haveAccessKeyId: !!cfg.AWS_ACCESS_KEY_ID,
    haveSecretAccessKey: !!cfg.AWS_SECRET_ACCESS_KEY,
    allowedOrigins: allowed,
  };
  try {
    const ping = await ensureBucketAccess();
    diag.bucketAccess = ping;
  } catch (e) {
    diag.bucketAccess = { ok: false, error: e?.message || String(e) };
  }
  res.json(diag);
});

app.get("/api/list", async (req, res) => {
  try {
    const prefix = req.query.prefix || "";
    const limit = Math.min(parseInt(req.query.limit || "100", 10), 2000);
    const items = await listKeys(prefix, limit);
    res.json({ items });
  } catch (e) {
    console.error("[list] error:", e);
    res.status(500).json({ error: "list_failed", message: e?.message || String(e) });
  }
});

app.post("/api/presign", async (req, res) => {
  try {
    const { key, type, size } = req.body || {};
    if (!key || !type || typeof size !== "number") {
      return res.status(400).json({ error: "bad_request", message: "key, type, size requeridos" });
    }
    const out = await presignPost({ key, contentType: type, size });
    res.json(out);
  } catch (e) {
    console.error("[presign] error:", e);
    res.status(500).json({ error: "presign_failed", message: e?.message || String(e) });
  }
});

app.get("/files/:encodedKey", async (req, res) => {
  try {
    const encoded = req.params.encodedKey;
    const key = decodeURIComponent(encoded);
    await streamGetObject({ key, res });
  } catch (e) {
    console.error("[files] error:", e);
    res.status(404).json({ error: "not_found", message: e?.message || "Objeto no encontrado" });
  }
});

const port = process.env.PORT || 10000;
app.listen(port, () => {
  console.log(`Mixtli API v1.11.0 on :${port}`);
  console.log("ALLOWED_ORIGINS =", allowed);
});
