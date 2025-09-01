const express = require("express");
const router = express.Router();
const { listFiles, getDownloadUrl, deleteFile } = require("../lib/s3");

router.get("/", async (req, res) => {
  try {
    const prefix = req.query.prefix || "uploads/";
    const files = await listFiles(prefix);
    res.json(files.map(f => ({
      key: f.Key,
      size: f.Size,
      lastModified: f.LastModified
    })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/download-url", async (req, res) => {
  try {
    const { key } = req.query;
    if (!key) return res.status(400).json({ error: "Key required" });
    const url = await getDownloadUrl(key);
    res.json({ url });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/", async (req, res) => {
  try {
    const { key } = req.query;
    if (!key) return res.status(400).json({ error: "Key required" });
    await deleteFile(key);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
