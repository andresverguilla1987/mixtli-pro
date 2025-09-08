\
#!/usr/bin/env bash
set -euo pipefail

echo "==> Mixtli Observability Kit - Apply"
REPO_ROOT="${REPO_ROOT:-.}"
API_DIR="$REPO_ROOT/apps/api"
SRC_DIR="$API_DIR/src"

if [ ! -d "$API_DIR" ]; then
  echo "ERROR: No existe apps/api en este repo (REPO_ROOT=$REPO_ROOT)"
  exit 1
fi

mkdir -p "$SRC_DIR"

# Copy metrics.ts if not present or if --force
if [ ! -f "$SRC_DIR/metrics.ts" ] || [ "${FORCE:-0}" = "1" ]; then
  cp -f "$(dirname "$0")/apps/api/src/metrics.ts" "$SRC_DIR/metrics.ts"
  echo "[ok] Copiado src/metrics.ts"
else
  echo "[skip] src/metrics.ts ya existe"
fi

APP_TS="$SRC_DIR/app.ts"
if [ ! -f "$APP_TS" ]; then
  echo "WARN: No existe $APP_TS; se intentará usar app.js (TS/JS)."
  APP_TS="$SRC_DIR/app.js"
fi

if [ ! -f "$APP_TS" ]; then
  echo "ERROR: No encontré apps/api/src/app.ts (ni app.js). Edita tu app principal manualmente para usar ./metrics."
  exit 1
fi

# 1) Ensure import line
if ! grep -q "from \"\./metrics\";" "$APP_TS" && ! grep -q "from '\./metrics';" "$APP_TS"; then
  sed -i '1i import { httpRequestDuration, metricsHandler } from "./metrics";' "$APP_TS"
  echo "[ok] Import agregado a app.ts"
else
  echo "[skip] Import ya presente"
fi

# 2) Add latency middleware after express() initialization
# Try to insert after the const app = express();
if grep -qE "const\s+app\s*=\s*express\s*\(\s*\)\s*;" "$APP_TS"; then
  awk '{
    print $0;
    if ($0 ~ /const[ \t]+app[ \t]*=[ \t]*express[ \t]*\([ \t]*\)[ \t]*;/ && !inserted) {
      print "const __mx_obsv_mw = (req, res, next) => {";
      print "  const end = httpRequestDuration.startTimer({ method: req.method, route: req.path });";
      print "  res.on(\\"finish\\", () => end({ code: String(res.statusCode) }));";
      print "  next();";
      print "};";
      print "app.use(__mx_obsv_mw);";
      inserted=1;
    }
  }' "$APP_TS" > "$APP_TS.__tmp" && mv "$APP_TS.__tmp" "$APP_TS"
  echo "[ok] Middleware de métricas insertado"
else
  # Fallback: if couldn't find, just append middleware at end guarded by existence
  if ! grep -q "__mx_obsv_mw" "$APP_TS"; then
    cat >> "$APP_TS" <<'EOF'

// ---- Mixtli Observability Kit (fallback inject) ----
try {
  const __mx_obsv_mw = (req, res, next) => {
    const end = httpRequestDuration.startTimer({ method: req.method, route: req.path });
    res.on("finish", () => end({ code: String(res.statusCode) }));
    next();
  };
  // @ts-ignore
  app && app.use && app.use(__mx_obsv_mw);
} catch {}
// ----------------------------------------------------
EOF
    echo "[ok] Middleware de métricas agregado (fallback)"
  else
    echo "[skip] Middleware ya presente"
  fi
fi

# 3) Add /metrics endpoint if missing
if ! grep -qE "app\.get\(\s*[\"']\/metrics[\"']" "$APP_TS"; then
  echo 'app.get("/metrics", metricsHandler);' >> "$APP_TS"
  echo "[ok] Ruta /metrics agregada"
else
  echo "[skip] Ruta /metrics ya presente"
fi

# 4) Add prom-client to deps (optional automatic)
if [ -f "$API_DIR/package.json" ]; then
  if ! grep -q '"prom-client"' "$API_DIR/package.json"; then
    echo "[info] Instalando prom-client..."
    (cd "$API_DIR" && npm i prom-client --save)
  else
    echo "[skip] prom-client ya declarado"
  fi
fi

echo "==> Listo. Rebuild/redeploy tu servicio y prueba /metrics"
