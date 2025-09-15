// src-snippets/server.allowed-origins.snippet.js
// Robust ALLOWED_ORIGINS parser: accepts JSON array, single string, or comma-separated string.

function parseAllowedOrigins(input) {
  if (!input) return [];
  if (Array.isArray(input)) return input;
  if (typeof input === "string") {
    try {
      const parsed = JSON.parse(input); // try JSON first
      if (Array.isArray(parsed)) return parsed;
      if (typeof parsed === "string") return [parsed];
    } catch (_) {
      // fallback: comma-separated
      return input.split(",").map(s => s.trim()).filter(Boolean);
    }
  }
  return [];
}

export const ALLOWED_ORIGINS = (() => {
  const raw = process.env.ALLOWED_ORIGINS;
  const list = parseAllowedOrigins(raw);
  return list.length ? list : ["http://localhost:5173"];
})();

export function corsOriginCheck(origin, callback) {
  // allow curl/postman/no-origin
  if (!origin) return callback(null, true);
  if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
  return callback(new Error("CORS: Origin not allowed: " + origin));
}

// Example usage (in server.js):
// import cors from "cors";
// import { ALLOWED_ORIGINS, corsOriginCheck } from "./src-snippets/server.allowed-origins.snippet.js";
// app.use(cors({ origin: corsOriginCheck, credentials: true }));
// console.log("[Mixtli] ALLOWED_ORIGINS =", ALLOWED_ORIGINS);
