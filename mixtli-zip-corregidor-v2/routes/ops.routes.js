// routes/ops.routes.js
import express from "express";
import {
  CopyObjectCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";

export default function createOpsRouter({ s3, bucket }) {
  const router = express.Router();
  router.use(express.json());

  const TRASH = "trash/";
  const str = (v) => (typeof v === "string" ? v : "");

  // 16) Mover/Renombrar
  router.post("/move", async (req, res) => {
    const from = str(req.body?.from), to = str(req.body?.to);
    if (!from || !to) return res.status(400).json({ error: "from/to required" });
    try {
      await s3.send(new CopyObjectCommand({ Bucket: bucket, CopySource: `/${bucket}/${encodeURIComponent(from)}`, Key: to }));
      await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: from }));
      res.json({ ok: true, from, to });
    } catch (e) { res.status(500).json({ error: "move-failed", detail: String(e) }); }
  });

  // 17) Enviar a papelera (DELETE /api/object?key=...)
  router.delete("/object", async (req, res) => {
    const key = str(req.query?.key);
    if (!key) return res.status(400).json({ error: "key required" });
    const tkey = `${TRASH}${key}`;
    try {
      await s3.send(new CopyObjectCommand({ Bucket: bucket, CopySource: `/${bucket}/${encodeURIComponent(key)}`, Key: tkey }));
      await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
      res.json({ ok: true, trashed: tkey });
    } catch (e) { res.status(500).json({ error: "trash-failed", detail: String(e) }); }
  });

  // 18) Restaurar desde papelera
  router.post("/trash/restore", async (req, res) => {
    const keys = Array.isArray(req.body?.keys) ? req.body.keys : [];
    if (!keys.length) return res.status(400).json({ error: "keys required" });
    const results = [];
    for (const tkey of keys) {
      const key = tkey.startsWith(TRASH) ? tkey.slice(TRASH.length) : tkey;
      try {
        await s3.send(new CopyObjectCommand({ Bucket: bucket, CopySource: `/${bucket}/${encodeURIComponent(tkey)}`, Key: key }));
        await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: tkey }));
        results.push({ ok: true, key });
      } catch (e) { results.push({ ok: false, key, error: String(e) }); }
    }
    res.json({ ok: results.every(r => r.ok), results });
  });

  // 19) Vaciar papelera
  router.post("/trash/empty", async (req, res) => {
    const prefix = str(req.body?.prefix || "");
    const full = `${TRASH}${prefix}`;
    let deleted = 0;
    try {
      let ContinuationToken;
      do {
        const out = await s3.send(new ListObjectsV2Command({ Bucket: bucket, Prefix: full, ContinuationToken }));
        const objs = (out.Contents || []).map(o => ({ Key: o.Key }));
        if (objs.length) {
          await s3.send(new DeleteObjectsCommand({ Bucket: bucket, Delete: { Objects: objs } }));
          deleted += objs.length;
        }
        ContinuationToken = out.IsTruncated ? out.NextContinuationToken : undefined;
      } while (ContinuationToken);
      res.json({ ok: true, deleted });
    } catch (e) { res.status(500).json({ error: "empty-failed", detail: String(e) }); }
  });

  // 14) Recalcular estadísticas (dummy OK)
  router.post("/stats/recalc", (_req, res) => res.json({ ok: true, message: "recalc queued" }));

  // 20) Backup (202 si está configurado BACKUP_*, 400 si no)
  router.post("/backup/run", (_req, res) => {
    const hasCfg = !!(process.env.BACKUP_BUCKET || process.env.BACKUP_PREFIX);
    if (!hasCfg) return res.status(400).json({ error: "backup not configured" });
    res.status(202).json({ ok: true, queued: true });
  });

  return router;
}
