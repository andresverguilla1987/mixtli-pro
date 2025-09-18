// routes/share.routes.js
import crypto from "crypto";
import express from "express";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

/**
 * Share router (public links)
 * ENDPOINTS:
 *  POST /api/share/create         { key, expiresSec=900, password="", maxDownloads=0 }
 *  GET  /api/share/:id            -> { url, key }
 *  GET  /api/share/list           -> array
 *  POST /api/share/revoke         { id }
 */
export default function createShareRouter({ s3, bucket, secret }) {
  const router = express.Router();
  router.use(express.json());

  // In-memory store (puedes cambiar a Redis/DB si quieres persistir)
  const store = new Map();

  const sign = (payload) => {
    const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
    const sig  = crypto.createHmac("sha256", secret).update(data).digest("base64url");
    return `${data}.${sig}`;
  };

  const verify = (id) => {
    const [data, sig] = String(id).split(".");
    const check = crypto.createHmac("sha256", secret).update(data).digest("base64url");
    if (sig !== check) throw new Error("bad-signature");
    return JSON.parse(Buffer.from(data, "base64url").toString("utf8"));
  };

  // 8) Crear enlace público
  router.post("/create", async (req, res) => {
    try {
      const { key, expiresSec = 900, password = "", maxDownloads = 0 } = req.body || {};
      if (!key) return res.status(400).json({ error: "key required" });
      const now = Date.now();
      const record = {
        key,
        password,
        createdAt: now,
        expiresAt: now + (Number(expiresSec) || 900) * 1000,
        maxDownloads: Number(maxDownloads) || 0,
        downloads: 0,
      };
      const id = sign({ key: record.key, password: record.password, expiresAt: record.expiresAt, maxDownloads: record.maxDownloads, createdAt: record.createdAt });
      store.set(id, record);
      res.json({ id, key: record.key, expiresAt: new Date(record.expiresAt).toISOString() });
    } catch (e) {
      res.status(500).json({ error: "share-create-failed", detail: String(e) });
    }
  });

  // 9/10) Resolver enlace (con o sin password)
  router.get("/:id", async (req, res) => {
    try {
      const id = req.params.id;
      const rec = store.get(id) || verify(id); // permite resolver aunque se reinicie el proceso (siempre que la firma sea válida)
      const needPw = rec.password && (req.query.pw || "") !== rec.password;
      if (needPw) return res.status(403).json({ error: "password required" });
      if (Date.now() > rec.expiresAt) return res.status(410).json({ error: "expired" });
      if (rec.maxDownloads > 0 && rec.downloads >= rec.maxDownloads) return res.status(410).json({ error: "consumed" });

      const url = await getSignedUrl(
        s3,
        new GetObjectCommand({ Bucket: bucket, Key: rec.key }),
        { expiresIn: 300 }
      );

      if (store.has(id)) store.get(id).downloads += 1;
      res.json({ url, key: rec.key });
    } catch (e) {
      res.status(400).json({ error: "invalid share id", detail: String(e) });
    }
  });

  // 11) Listar enlaces (en memoria)
  router.get("/list", (_req, res) => {
    const list = Array.from(store.entries()).map(([id, r]) => ({
      id,
      key: r.key,
      downloads: r.downloads,
      maxDownloads: r.maxDownloads,
      expiresAt: new Date(r.expiresAt).toISOString(),
    }));
    res.json(list);
  });

  // 12) Revocar enlace
  router.post("/revoke", (req, res) => {
    const { id } = req.body || {};
    if (!id) return res.status(400).json({ error: "id required" });
    store.delete(id);
    res.json({ ok: true });
  });

  return router;
}
