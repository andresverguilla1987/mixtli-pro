
// === /api/presign (handler recomendado) ===
app.post("/api/presign", express.json(), async (req, res) => {
  try {
    const { key, contentType, type, size, contentLength } = req.body || {};
    const ct = contentType || type;                 // <-- acepta ambos nombres
    const len = (typeof contentLength === "number") ? contentLength : size;

    if (!key || !ct || typeof len !== "number") {
      return res.status(400).json({
        error: "bad_request",
        require: ["key", "contentType/type", "size/contentLength"]
      });
    }

    const result = await presignUpload(key, ct, len);
    // result esperado: { url, fields } (S3 POST) o { url, method, headers } (PUT)
    return res.json(result);
  } catch (err) {
    console.error("[presign] error:", err);
    return res.status(500).json({ error: "presign_failed", detail: err?.message || "unknown" });
  }
});
