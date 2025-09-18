// routes/mixtli-featurepack-a.js
// FeaturePack A – FIX (con /featurepack/ping y export compatible CJS/ESM)
// Endpoints extra: mkdir, share (create/get/post/list/revoke), move, delete, trash(restore/empty - stub), stats, backup
//
// Cómo montar:
//   CJS: const featurePack = require("./routes/mixtli-featurepack-a")(s3, bucket, getSignedUrl); app.use(featurePack);
//   ESM: import featurePackFactory from "./routes/mixtli-featurepack-a.js"; const featurePack = featurePackFactory(s3, bucket, getSignedUrl); app.use(featurePack);

const express = require("express");
const crypto = require("crypto");
const {
  PutObjectCommand,
  HeadObjectCommand,
  CopyObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand
} = require("@aws-sdk/client-s3");

function factory(s3, bucket, getSignedUrl) {
  const router = express.Router();
  router.use(express.json());

  const need = (v, name) => {
    if (!v || typeof v !== "string" || !v.trim()) {
      const e = new Error(`Falta '${name}'`);
      e.status = 400;
      throw e;
    }
  };

  // 0) Ping para verificar montaje
  router.get("/featurepack/ping", (req, res) => res.json({ ok: true, pack: "A-FIX" }));

  // 01) mkdir
  router.post("/api/mkdir", async (req, res, next) => {
    try {
      let { key } = req.body || {};
      need(key, "key");
      if (!key.endsWith("/")) key += "/";
      const placeholder = `${key}.keep`;
      await s3.send(new PutObjectCommand({
        Bucket: bucket, Key: placeholder, Body: "", ContentType: "application/octet-stream"
      }));
      res.json({ ok: true, folder: key, placeholder });
    } catch (err) { next(err); }
  });

  // SHARES en memoria (no persistente)
  const shares = new Map();
  const sha256 = (t) => crypto.createHash("sha256").update(String(t)).digest("hex");

  // 03) share/create
  router.post("/api/share/create", async (req, res, next) => {
    try {
      const { key, expiresSec = 900, password = "", maxDownloads = 0 } = req.body || {};
      need(key, "key");
      await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
      const id = crypto.randomBytes(8).toString("hex");
      shares.set(id, { key, expiresSec: Number(expiresSec)||900, passwordHash: password ? sha256(password) : "", maxDownloads: Number(maxDownloads)||0, downloads: 0, createdAt: Date.now() });
      res.json({ ok: true, id });
    } catch (err) { next(err); }
  });

  // 04) share GET (resolver sin password)
  router.get("/api/share/:id", async (req, res, next) => {
    try {
      const sh = shares.get(req.params.id);
      if (!sh) return res.status(404).json({ error: "ShareNotFound" });
      const url = await getSignedUrl(s3, new GetObjectCommand({ Bucket: bucket, Key: sh.key }), { expiresIn: sh.expiresSec });
      res.json({ ok: true, id: req.params.id, key: sh.key, url });
    } catch (err) { next(err); }
  });

  // 05) share POST (resolver con password)
  router.post("/api/share/:id", async (req, res, next) => {
    try {
      const sh = shares.get(req.params.id);
      if (!sh) return res.status(404).json({ error: "ShareNotFound" });
      const { password = "" } = req.body || {};
      const hash = password ? sha256(password) : "";
      if (sh.passwordHash && sh.passwordHash !== hash) return res.status(401).json({ error: "PasswordMismatch" });
      if (sh.maxDownloads > 0 && sh.downloads >= sh.maxDownloads) return res.status(429).json({ error: "MaxDownloadsReached" });
      const url = await getSignedUrl(s3, new GetObjectCommand({ Bucket: bucket, Key: sh.key }), { expiresIn: sh.expiresSec });
      sh.downloads++;
      res.json({ ok: true, id: req.params.id, key: sh.key, url });
    } catch (err) { next(err); }
  });

  // 06) share/list
  router.get("/api/share/list", (req, res) => {
    const items = [...shares.entries()].map(([id, s]) => ({
      id, key: s.key, expiresSec: s.expiresSec, maxDownloads: s.maxDownloads, downloads: s.downloads, createdAt: s.createdAt
    }));
    res.json({ ok: true, items });
  });

  // 07) share/revoke
  router.post("/api/share/revoke", (req, res) => {
    const { id } = req.body || {};
    if (!id) return res.status(400).json({ error: "id requerido" });
    const removed = shares.delete(String(id));
    res.json({ ok: true, removed });
  });

  // 08) move
  router.post("/api/move", async (req, res, next) => {
    try {
      const { from, to } = req.body || {};
      need(from, "from"); need(to, "to");
      await s3.send(new CopyObjectCommand({ Bucket: bucket, CopySource: `/${bucket}/${encodeURIComponent(from)}`, Key: to }));
      await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: from }));
      res.json({ ok: true, from, to });
    } catch (err) { next(err); }
  });

  // 09) delete object
  router.delete("/api/object", async (req, res, next) => {
    try {
      const key = req.query.key;
      need(key, "key");
      await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
      res.json({ ok: true, key });
    } catch (err) { next(err); }
  });

  // 10) trash restore (stub con prefijo trash/)
  router.post("/api/trash/restore", async (req, res, next) => {
    try {
      let { key } = req.body || {};
      need(key, "key");
      if (!key.startsWith("trash/")) key = `trash/${key}`;
      const to = key.replace(/^trash\//, "");
      await s3.send(new CopyObjectCommand({ Bucket: bucket, CopySource: `/${bucket}/${encodeURIComponent(key)}`, Key: to }));
      await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
      res.json({ ok: true, restored: to });
    } catch (err) { next(err); }
  });

  // 11) trash empty (stub)
  router.post("/api/trash/empty", (req, res) => res.json({ ok: true, note: "Stub: implementar borrado masivo para trash/" }));

  // 12) stats recalc (stub)
  router.post("/api/stats/recalc", (req, res) => res.json({ ok: true }));

  // 13) backup run (stub)
  router.post("/api/backup/run", (req, res) => res.json({ ok: true }));

  // Error handler
  router.use((err, req, res, next) => {
    const code = err.status || 500;
    res.status(code).json({ ok: false, error: err.name || "Error", message: err.message || String(err) });
  });

  return router;
}

// Export compatible
module.exports = factory;
module.exports.default = factory;
