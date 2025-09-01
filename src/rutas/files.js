
// src/rutas/files.js - CommonJS
const express = require("express");
const router = express.Router();
const s3 = require("../lib/s3");

// GET /api/files?prefix=uploads/
router.get("/", async (req, res) => {
  try {
    const prefix = (req.query.prefix || "uploads/") + "";
    const items = await s3.list(prefix);
    res.json({ items });
  } catch (err) {
    console.error("files.list error:", err);
    res.status(500).json({ error: "files_list_failed" });
  }
});

// DELETE /api/files/:key  (key va urlencoded)
router.delete("/:key", async (req, res) => {
  try {
    const raw = req.params.key;
    const key = decodeURIComponent(raw);
    if (!key) return res.status(400).json({ error: "missing_key" });
    await s3.remove(key);
    res.json({ ok: true });
  } catch (err) {
    console.error("files.delete error:", err);
    res.status(500).json({ error: "files_delete_failed" });
  }
});

module.exports = router;
