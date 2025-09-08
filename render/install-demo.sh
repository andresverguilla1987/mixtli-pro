#!/usr/bin/env bash
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel 2>/dev/null || echo .)"
API_DIR="$ROOT/apps/api"
SRC_DIR="$API_DIR/src"

# 1) Copy demo source files (idempotent)
mkdir -p "$SRC_DIR" "$ROOT/postman" "$ROOT/render"
cp -f "$ROOT/render/demo.ts" "$SRC_DIR/demo.ts" 2>/dev/null || true
cp -f "$ROOT/render/demo-data.ts" "$SRC_DIR/demo-data.ts" 2>/dev/null || true

# 2) Ensure DEMO block is mounted in app.ts (idempotent)
APP_TS="$SRC_DIR/app.ts"
if [ -f "$APP_TS" ]; then
  if ! grep -q "from './demo'" "$APP_TS"; then
    # Insert import near the top (after first import)
    awk 'NR==1{print} NR==2{print "import demoRouter from '"'"'./demo'"'"';"} NR>2{print}' "$APP_TS" > "$APP_TS.tmp" && mv "$APP_TS.tmp" "$APP_TS"
  fi
  if ! grep -q "app.use('/demo', demoRouter)" "$APP_TS"; then
    # Append guarded mount near the end
    printf "\n// -- Mixtli demo routes (guarded) --\nif (process.env.DEMO_ENABLED === 'true') {\n  app.use('/demo', demoRouter);\n}\n" >> "$APP_TS"
  fi
else
  echo "WARN: $APP_TS no existe. Copia manualmente las líneas para montar el router:"
  echo "import demoRouter from './demo';"
  echo "if (process.env.DEMO_ENABLED === 'true') { app.use('/demo', demoRouter); }"
fi

# 3) Copy Postman collection & README
cp -f "$ROOT/render/MixtliDemo.postman_collection.json" "$ROOT/postman/MixtliDemo.postman_collection.json" 2>/dev/null || true
cp -f "$ROOT/render/README-DEMO.md" "$ROOT/README-DEMO.md" 2>/dev/null || true
cp -f "$ROOT/render/.env.demo.example" "$ROOT/.env.demo.example" 2>/dev/null || true

echo "[install-demo] Hecho. Agrega DEMO_ENABLED, DEMO_PIN y despliega."
