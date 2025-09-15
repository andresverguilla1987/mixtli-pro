// server-snippets/allowed-origins.js - ESM
import cors from "cors";

export function parseAllowedOrigins(envValue) {
  if (!envValue) return [];
  try {
    const parsed = JSON.parse(envValue);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return String(envValue)
      .split(",")
      .map(s => s.trim())
      .filter(Boolean);
  }
}

export function makeCors(envValue) {
  const allowed = parseAllowedOrigins(envValue);
  return cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true); // allow curl/postman
      if (allowed.length === 0) return cb(null, true); // allow all if not set
      return cb(null, allowed.includes(origin));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "HEAD", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    maxAge: 600,
  });
}
