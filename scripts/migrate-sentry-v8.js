
  #!/usr/bin/env node
  /**
   * Autopatch Sentry v7 -> v8 in your Express app source.
   * - Removes Sentry.Handlers.* calls
   * - Ensures `import * as Sentry from "@sentry/node"`
   * - Adds `Sentry.setupExpressErrorHandler(app)` once
   *
   * Usage:
   *   node scripts/migrate-sentry-v8.js [optional/path/to/app.ts]
   *   # or set MIXTLI_APP_FILES="apps/api/src/app.ts,apps/api/src/server.ts"
   */
  const fs = require("fs");
  const path = require("path");
  const glob = require("glob");

  const projectRoot = process.cwd();
  const defaultSearchRoot = path.join(projectRoot, "apps", "api", "src");

  function listCandidates() {
    const envList = process.env.MIXTLI_APP_FILES;
    if (envList) {
      return envList.split(",").map(s => s.trim()).filter(Boolean);
    }
    const arg = process.argv[2];
    if (arg) return [arg];
    const patterns = [
      "**/app.@(ts|tsx|js|mjs|cjs)",
      "**/server.@(ts|tsx|js|mjs|cjs)",
      "**/index.@(ts|tsx|js|mjs|cjs)",
      "**/api.@(ts|tsx|js|mjs|cjs)",
    ];
    const files = new Set();
    for (const p of patterns) {
      for (const f of glob.sync(path.join(defaultSearchRoot, p), { nocase: true })) {
        files.add(path.relative(projectRoot, f));
      }
    }
    return Array.from(files);
  }

  function unique(arr) { return Array.from(new Set(arr)); }

  function patchFile(relPath) {
    const full = path.join(projectRoot, relPath);
    if (!fs.existsSync(full) || !fs.statSync(full).isFile()) return { relPath, skipped: true, reason: "not found" };

    let src = fs.readFileSync(full, "utf8");
    const original = src;
    let changed = false;

    // 1) Remove old Handlers.* calls
    const handlerRegexes = [
      /app\.use\(\s*Sentry\.Handlers\.requestHandler\(\s*\)\s*\);\s*/g,
      /app\.use\(\s*Sentry\.Handlers\.tracingHandler\(\s*\)\s*\);\s*/g,
      /app\.use\(\s*Sentry\.Handlers\.errorHandler\(\s*\)\s*\);\s*/g,
    ];
    for (const rx of handlerRegexes) {
      const before = src;
      src = src.replace(rx, "");
      if (src !== before) changed = true;
    }

    // 2) Ensure Sentry import
    if (!/from\s+["']@sentry\/node["']/.test(src)) {
      src = `import * as Sentry from "@sentry/node";\n` + src;
      changed = true;
    }

    // 3) Ensure setupExpressErrorHandler(app)
    if (!/Sentry\.setupExpressErrorHandler\s*\(\s*app\s*\)/.test(src)) {
      const insertLine = `\n// Sentry v8 error handler\nSentry.setupExpressErrorHandler(app);\n`;
      let inserted = false;
      const exportDefaultIdx = src.lastIndexOf("export default");
      if (exportDefaultIdx !== -1) {
        src = src.slice(0, exportDefaultIdx) + insertLine + src.slice(exportDefaultIdx);
        inserted = true;
      }
      if (!inserted) {
        const moduleExportsIdx = src.lastIndexOf("module.exports");
        if (moduleExportsIdx !== -1) {
          src = src.slice(0, moduleExportsIdx) + insertLine + src.slice(moduleExportsIdx);
          inserted = true;
        }
      }
      if (!inserted) src += insertLine;
      changed = true;
    }

    if (changed) fs.writeFileSync(full, src, "utf8");
    return { relPath, changed, skipped: false };
  }

  function ensureInstrumentTS() {
    const dest = path.join(projectRoot, "apps", "api", "src", "sentry", "instrument.ts");
    if (fs.existsSync(dest)) return false;
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    const content = `import * as Sentry from "@sentry/node";
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV ?? "production",
  tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? 1),
  profilesSampleRate: Number(process.env.SENTRY_PROFILES_SAMPLE_RATE ?? 0),
});\n`;
    fs.writeFileSync(dest, content, "utf8");
    return true;
  }

  function main() {
    const candidates = unique(listCandidates());
    if (!candidates.length) {
      console.log("No candidates found. Pass your app.ts path as argument.");
      process.exit(0);
    }
    const results = candidates.slice(0, 50).map(patchFile);
    const addedInstrument = ensureInstrumentTS();

    console.log("=== MIGRACIÓN SENTRY v8 ===");
    results.forEach(r => {
      if (r.skipped) console.log(`SKIP  - ${r.relPath} (${r.reason})`);
      else if (r.changed) console.log(`OK    - ${r.relPath} (modificado)`);
      else console.log(`NOOP  - ${r.relPath} (sin cambios necesarios)`);
    });
    console.log(addedInstrument ? "OK    - instrument.ts creado" : "EXIST - instrument.ts ya existía");
  }

  main();
