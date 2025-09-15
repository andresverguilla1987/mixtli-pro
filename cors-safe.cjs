// cors-safe.cjs (CommonJS)
// Robust parser for ALLOWED_ORIGINS and an Express CORS middleware.

function parseOrigins(raw) {
  if (!raw) return [];
  const eq = raw.indexOf("=");
  if (raw.startsWith("ALLOWED_ORIGINS") && eq !== -1) raw = raw.slice(eq + 1);

  try {
    const j = JSON.parse(raw);
    if (Array.isArray(j)) return j;
  } catch {}

  return raw
    .replace(/^[\[\s]*/, "")
    .replace(/[\]\s]*$/, "")
    .split(/[\s,]+/)
    .map(s => s.trim().replace(/^"+|"+$/g, ""))
    .filter(Boolean);
}

function getAllowedOrigins() {
  return parseOrigins(process.env.ALLOWED_ORIGINS || "");
}

function corsMiddleware(origins, opts = {}) {
  const allowed = Array.isArray(origins) ? origins : getAllowedOrigins();
  const allowMethods = opts.methods || "GET,POST,PUT,OPTIONS";
  const allowHeaders = opts.headers || "Content-Type,x-mixtli-token";
  const allowCredentials = !!opts.credentials;

  return function(req, res, next) {
    const origin = req.headers.origin;
    if (origin && allowed.includes(origin)) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Vary", "Origin");
    }
    res.setHeader("Access-Control-Allow-Methods", allowMethods);
    res.setHeader("Access-Control-Allow-Headers", allowHeaders);
    if (allowCredentials) res.setHeader("Access-Control-Allow-Credentials", "true");
    if (req.method === "OPTIONS") return res.status(204).end();
    next();
  };
}

module.exports = { parseOrigins, getAllowedOrigins, corsMiddleware };
