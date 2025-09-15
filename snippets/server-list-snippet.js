
// === /api/list (handler robusto) ===
app.get("/api/list", async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit ?? "100", 10), 1000);
    const prefix = req.query.prefix ?? "";
    const items = await listAll(prefix, limit);
    return res.json({ items });
  } catch (err) {
    console.error("[list] error:", err);
    return res.status(500).json({ error: "list_failed", detail: err?.message || "unknown" });
  }
});
