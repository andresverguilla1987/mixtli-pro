
// scripts/apply-mixtli-refresh.js
// Uso: node scripts/apply-mixtli-refresh.js
// Inserta `import refresh from './refresh'` y `app.use('/api', refresh);` en apps/api/src/app.ts
const fs = require('fs');
const path = require('path');

const target = path.join(process.cwd(), 'apps', 'api', 'src', 'app.ts');
if (!fs.existsSync(target)) {
  console.error('[mixtli] No se encontró apps/api/src/app.ts en este repo.');
  process.exit(1);
}

let src = fs.readFileSync(target, 'utf8');

// 1) Inyectar import si no existe
if (!/from\s+['"]\.\/refresh['"]/.test(src)) {
  // Buscar el último import
  const importRegex = /^import .*?;$/mg;
  let lastImportIndex = -1, m;
  while ((m = importRegex.exec(src)) !== null) {
    lastImportIndex = m.index + m[0].length;
  }
  const importLine = `\nimport refresh from './refresh';\n`;
  if (lastImportIndex >= 0) {
    src = src.slice(0, lastImportIndex) + importLine + src.slice(lastImportIndex);
  } else {
    // No encontró imports, prefijar
    src = importLine + src;
  }
  console.log('[mixtli] Import de refresh agregado.');
} else {
  console.log('[mixtli] Import de refresh ya existía.');
}

// 2) Inyectar uso del router si no existe
if (!/app\.use\(\s*['"]\/api['"]\s*,\s*refresh\s*\)/.test(src)) {
  // Estrategia: insertar después del último app.use(...)
  const appUseRegex = /app\.use\([^)]*\);\s*$/mg;
  let lastUseEnd = -1, m2;
  while ((m2 = appUseRegex.exec(src)) !== null) {
    lastUseEnd = m2.index + m2[0].length;
  }
  const line = `\n// Mixtli demo refresh endpoint\napp.use('/api', refresh);\n`;
  if (lastUseEnd >= 0) {
    src = src.slice(0, lastUseEnd) + line + src.slice(lastUseEnd);
  } else {
    // Fallback: intentar después de la creación del app
    const appCreate = /const\s+app\s*=\s*express\(\)\s*;?/;
    const matchCreate = src.match(appCreate);
    if (matchCreate) {
      const idx = src.indexOf(matchCreate[0]) + matchCreate[0].length;
      src = src.slice(0, idx) + line + src.slice(idx);
    } else {
      // Último fallback: al final del archivo
      src = src + line;
    }
  }
  console.log('[mixtli] app.use("/api", refresh) agregado.');
} else {
  console.log('[mixtli] app.use("/api", refresh) ya existía.');
}

fs.writeFileSync(target, src);
console.log('[mixtli] Listo. Recompila/ despliega para activar /api/refresh');
