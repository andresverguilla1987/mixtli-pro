// cors-safe.js (ESM)
// Robust parser for ALLOWED_ORIGINS and an Express CORS middleware.
// Works even if the value is given as 'ALLOWED_ORIGINS=[...]' by mistake.

export function parseOrigins(raw) {
  if (!raw) return [];
  // Accept accidental prefix "ALLOWED_ORIGINS="
  const eq = raw.indexOf("=");
  if (raw.startsWith("ALLOWED_ORIGINS") && eq !== -1) raw = raw.slice(eq + 1);

  // Try strict JSON first
  try {
    const j = JSON.parse(raw);
    if (Array.isArray(j)) return j;
  } catch {}

  // Fallbacks: comma/space separated, possibly wrapped in [] and quotes
  return raw
    .replace(/^[\[\s]*/, "")
    .replace(/[\]\s]*$/, "")
    .split(/[\s,]+/)
    .map(s => s.trim().replace(/^"+|"+$/g, ""))
    .filter(Boolean);
}

export function getAllowedOrigins() {
  return parseOrigins(process.env.ALLOWED_ORIGINS || "");
}

export function corsMiddleware(origins, opts = {}) {
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
