#!/usr/bin/env node
/**
 * Autopatch Redis init to use REDIS_URL instead of localhost:6379.
 * Handles node-redis and ioredis common patterns.
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

  // node-redis
  src = src.replace(/createClient\(\s*\)/g, 'createClient({ url: process.env.REDIS_URL ?? "redis://127.0.0.1:6379" })');
  src = src.replace(/createClient\(\s*\{(?![^}]*\burl\b)/g, 'createClient({ url: process.env.REDIS_URL ?? "redis://127.0.0.1:6379", ');

  // ioredis
  src = src.replace(/new\s+Redis\(\s*\)/g, 'new Redis(process.env.REDIS_URL ?? "redis://127.0.0.1:6379")');
  src = src.replace(/new\s+Redis\(\s*\{[\s\S]*?\}\s*\)/g, 'new Redis(process.env.REDIS_URL ?? "redis://127.0.0.1:6379")');

  // hardcoded strings
  src = src.replace(/["']redis:\/\/(?:localhost|127\.0\.0\.1):6379["']/g, 'process.env.REDIS_URL ?? "redis://127.0.0.1:6379"');

  if (src !== before) {
    fs.writeFileSync(full, src, "utf-8");
    results.push(full);
  }
}

console.log("=== MIGRACIÓN REDIS URL ===");
results.length ? results.forEach(f => console.log("OK   - " + path.relative(projectRoot, f))) : console.log("NOOP - sin cambios");
