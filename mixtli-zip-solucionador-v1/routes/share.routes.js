// routes/share.routes.js
// Rutas /api/share: create, resolve, list, revoke (estado en memoria). ESM.

import crypto from "crypto";
import express from "express";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

/**
 * @param {object} opts
 * @param {import("@aws-sdk/client-s3").S3Client} opts.s3
 * @param {string} opts.bucket
 * @param {string} opts.secret
 */
export default function createShareRouter({ s3, bucket, secret }) {
  const router = express.Router();
  router.use(express.json());

  const store = new Map(); // id -> { key, password, expiresAt, maxDownloads, downloads, createdAt }

  const sign = (payload) => {
    const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
    const sig = crypto.createHmac("sha256", secret).update(data).digest("base64url");
    return `${data}.${sig}`;
  };

  const verify = (id) => {
    const [data, sig] = String(id).split(".");
    const check = crypto.createHmac("sha256", secret).update(data).digest("base64url");
    if (sig !== check) throw new Error("bad-signature");
    return JSON.parse(Buffer.from(data, "base64url").toString("utf8"));
  };

  // POST /api/share/create
  router.post("/create", async (req, res) => {
    const { key, expiresSec = 900, password = "", maxDownloads = 0 } = req.body || {};
    if (!key) return res.status(400).json({ error: "key required" });
    const now = Date.now();
    const payload = {
      key,
      password,
      expiresAt: now + (Number(expiresSec) || 900) * 1000,
      maxDownloads: Number(maxDownloads) || 0,
      createdAt: now,
    };
    const id = sign(payload);
    store.set(id, { ...payload, downloads: 0 });
    return res.json({ id, key, expiresAt: new Date(payload.expiresAt).toISOString() });
  });

  // GET /api/share/:id   (?pw= opcional)
  router.get("/:id", async (req, res) => {
    const { id } = req.params;
    try {
      const payload = verify(id);
      const rec = store.get(id) || payload;

      if (rec.password && (req.query.pw || "") !== rec.password) {
        return res.status(403).json({ error: "password required" });
      }
      if (Date.now() > rec.expiresAt) return res.status(410).json({ error: "expired" });
      if (rec.maxDownloads > 0 && (rec.downloads || 0) >= rec.maxDownloads) {
        return res.status(410).json({ error: "consumed" });
      }

      const url = await getSignedUrl(
        s3,
        new GetObjectCommand({ Bucket: bucket, Key: rec.key }),
        { expiresIn: 300 }
      );
      if (store.has(id)) store.get(id).downloads = (store.get(id).downloads || 0) + 1;
      return res.json({ url, key: rec.key });
    } catch (err) {
      return res.status(400).json({ error: "invalid share id" });
    }
  });

  // GET /api/share/list
  router.get("/list", (_req, res) => {
    const list = Array.from(store.entries()).map(([id, r]) => ({
      id,
      key: r.key,
      downloads: r.downloads || 0,
      maxDownloads: r.maxDownloads || 0,
      expiresAt: new Date(r.expiresAt).toISOString(),
    }));
    return res.json(list);
  });

  // POST /api/share/revoke
  router.post("/revoke", (req, res) => {
    const { id } = req.body || {};
    if (!id) return res.status(400).json({ error: "id required" });
    store.delete(id);
    return res.json({ ok: true });
  });

  return router;
}
