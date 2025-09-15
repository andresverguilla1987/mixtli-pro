// server-snippets/presign-route.js
import { Router } from "express";
import { presignUpload, presignGet, listAll } from "../utils/s3.js";

const router = Router();

// POST /api/presign  -> body: { key|filename|name, contentType|type|mimetype, mode: "put"|"get"}
router.post("/api/presign", async (req, res) => {
  try {
    const b = req.body || {};
    const key = b.key || b.filename || b.name;
    const contentType = b.contentType || b.type || b.mimetype || "application/octet-stream";
    const mode = (b.mode || "put").toLowerCase();

    if (!key) return res.status(400).json({ ok: false, error: "key/filename/name is required" });

    if (mode === "get") {
      const out = await presignGet({ key });
      return res.json({ ok: true, ...out });
    }
    const out = await presignUpload({ key, contentType });
    return res.json({ ok: true, ...out });
  } catch (err) {
    res.status(500).json({ ok: false, error: err?.message || String(err) });
  }
});

// GET /api/list?prefix=&limit=
router.get("/api/list", async (req, res) => {
  try {
    const prefix = req.query.prefix || "";
    const limit = Math.min(parseInt(req.query.limit || "1000", 10), 2000);
    const items = await listAll({ prefix, limit });
    res.json({ ok: true, items });
  } catch (err) {
    res.status(500).json({ ok: false, error: err?.message || String(err) });
  }
});

export default router;