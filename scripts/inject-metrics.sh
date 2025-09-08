\
#!/usr/bin/env bash
set -euo pipefail

APP_FILE="apps/api/src/app.ts"

if [ ! -f "$APP_FILE" ]; then
  echo "[metrics-pack] ERROR: $APP_FILE no existe."
  exit 1
fi

# 1) Import
if ! grep -q 'metrics/setup' "$APP_FILE"; then
  echo "[metrics-pack] Añadiendo import setupMetrics..."
  # Inserta al inicio para evitar conflictos con otras importaciones
  sed -i '1s|^|import { setupMetrics } from "./metrics/setup.js";\n|' "$APP_FILE"
fi

# 2) Llamada después de crear app = express()
echo "[metrics-pack] Insertando setupMetrics(app) si no existe..."
awk 'BEGIN{done=0}
{
  print $0
  if ($0 ~ /const[[:space:]]+app[[:space:]]*=[[:space:]]*express/ && done==0) {
    print "setupMetrics(app); // [metrics-pack]";
    done=1
  }
}' "$APP_FILE" > "$APP_FILE.tmp"

mv "$APP_FILE.tmp" "$APP_FILE"

echo "[metrics-pack] Inyección completada."
