
#!/usr/bin/env node
/**
 * Autopatch Redis init so it stops using localhost:6379 and switches to REDIS_URL.
 * - Rewrites common patterns for node-redis and ioredis.
 * - Adds safe default: process.env.REDIS_URL ?? 'redis://127.0.0.1:6379'
 *
 * Usage:
 *   node scripts/migrate-redis-url.js [baseDir default=apps/api/src]
 */
const fs = require("fs");
const path = require("path");
const glob = require("glob");

const projectRoot = process.cwd();
const baseDir = process.argv[2] ? path.resolve(process.argv[2]) : path.join(projectRoot, "apps", "api", "src");

const files = glob.sync(path.join(baseDir, "**/*.+(ts|tsx|js|mjs|cjs)"), { nocase: true });

const results = [];
for (const full of files) {
  let src = fs.readFileSync(full, "utf8");
  const before = src;
  let changed = false;

  // 1) node-redis createClient() with no args -> add URL
  src = src.replace(/createClient\(\s*\)/g, 'createClient({ url: process.env.REDIS_URL ?? "redis://127.0.0.1:6379" })');

  // 2) node-redis createClient({...}) without url: add it (simple heuristic: insert url at start of object)
  src = src.replace(/createClient\(\s*\{(?![^}]*\burl\b)/g, 'createClient({ url: process.env.REDIS_URL ?? "redis://127.0.0.1:6379", ');

  // 3) ioredis: new Redis() -> new Redis(REDIS_URL)
  src = src.replace(/new\s+Redis\(\s*\)/g, 'new Redis(process.env.REDIS_URL ?? "redis://127.0.0.1:6379")');

  // 4) ioredis: new Redis({...}) -> new Redis(REDIS_URL)
  src = src.replace(/new\s+Redis\(\s*\{[\s\S]*?\}\s*\)/g, 'new Redis(process.env.REDIS_URL ?? "redis://127.0.0.1:6379")');

  // 5) Hard-coded localhost/127.0.0.1:6379 in strings -> REDIS_URL fallback (only obvious redis:// forms)
  src = src.replace(/["']redis:\/\/(?:localhost|127\.0\.0\.1):6379["']/g, 'process.env.REDIS_URL ?? "redis://127.0.0.1:6379"');

  // Mark change
  changed = (src !== before);
  if (changed) {
    fs.writeFileSync(full, src, "utf8");
    results.push({ file: path.relative(projectRoot, full), changed });
  }
}

console.log("=== MIGRACIÓN REDIS URL ===");
if (!results.length) {
  console.log("NOOP - No se detectaron patrones que requieran cambio.");
} else {
  for (const r of results) console.log("OK   - " + r.file);
}
console.log("\nAsegúrate de definir REDIS_URL en tu entorno de Render (Internal Connection String).");
