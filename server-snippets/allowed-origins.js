// server-snippets/allowed-origins.js
export function parseAllowedOrigins(input) {
  if (!input) return [];
  const raw = String(input).trim();
  if (!raw) return [];
  // If it's JSON array, parse it. Otherwise, split by comma.
  if (raw.startsWith("[") && raw.endsWith("]")) {
    try {
      const arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr.map(x => String(x).trim()).filter(Boolean) : [];
    } catch {
      // fall through to comma split
    }
  }
  return raw.split(",").map(s => s.trim()).filter(Boolean);
}

export function makeCors(allowed) {
  const allowedSet = new Set(parseAllowedOrigins(allowed));
  return function corsMiddleware(req, res, next) {
    const origin = req.headers.origin;
    if (origin && (allowedSet.has(origin) || allowedSet.has("*"))) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Vary", "Origin");
      res.setHeader("Access-Control-Allow-Credentials", "true");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");
      res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
      res.setHeader("Access-Control-Max-Age", "86400");
    }
    if (req.method === "OPTIONS") {
      return res.status(204).end();
    }
    next();
  };
}