// cors-setup.js
// CORS robusto + preflight + trazas y límite de subida (multer) a 50MB
import cors from "cors";
import multer from "multer";
import bodyParser from "body-parser";

// Exporta funciones para aplicar CORS y crear middleware de subida (multer)
export function applyCors(app) {
  const ORIGINS = (process.env.ALLOWED_ORIGINS || "")
    .split(",")
    .map(s => s.trim())
    .filter(Boolean);

  console.log("ALLOWED_ORIGINS =", ORIGINS.length ? ORIGINS : "(vacío)");

  const corsOrigin = (origin, cb) => {
    if (!origin) return cb(null, true);           // permitir server-side/curl
    if (ORIGINS.includes("*")) return cb(null, true);
    if (ORIGINS.includes(origin)) return cb(null, true);
    return cb(new Error("CORS not allowed: " + origin));
  };

  const corsMw = cors({
    origin: corsOrigin,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "x-mixtli-token", "Authorization", "X-Requested-With"],
    exposedHeaders: ["ETag", "Location", "x-amz-request-id", "x-amz-version-id"],
    optionsSuccessStatus: 204
  });

  app.use(corsMw);
  app.options("*", corsMw);
  app.use((req, res, next) => {
    res.setHeader("Timing-Allow-Origin", "*");
    next();
  });

  // Parsers de JSON (no afecta multipart/form-data)
  app.use(bodyParser.json({ limit: "2mb" }));
}

// Multer con límite de 50MB para endpoints de subida
export function createUploadMw() {
  return multer({ limits: { fileSize: 50 * 1024 * 1024 } });
}

// Middleware de manejo de errores (incluye CORS)
export function applyErrorHandler(app) {
  app.use((err, req, res, next) => {
    console.error(err?.message || err);
    if (/CORS not allowed/i.test(err?.message)) {
      return res.status(403).json({ ok: false, error: err.message });
    }
    res.status(500).json({ ok: false, error: "server_error" });
  });
}
