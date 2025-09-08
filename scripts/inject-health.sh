#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(pwd)"
APP_TS="apps/api/src/app.ts"
if [ ! -f "$APP_TS" ]; then
  echo "No se encontró $APP_TS. Ajusta la ruta si tu entry es otro." 1>&2
  exit 1
fi

# 1) Copiar health.ts si no existe
if [ ! -f "apps/api/src/health.ts" ]; then
  echo "ERROR: Falta apps/api/src/health.ts. Asegúrate de descomprimir el ZIP en la raíz del repo." 1>&2
  exit 1
fi

# 2) Insertar import si no existe
if ! grep -q "from './health'" "$APP_TS"; then
  # Insertar la línea de import al inicio del archivo (después de otros imports)
  awk 'BEGIN{done=0} 
       /^import / && done==0 {print; next} 
       done==0 {print "import healthRouter from './health';"; done=1; print; next} 
       {print}' "$APP_TS" > "$APP_TS.tmp" && mv "$APP_TS.tmp" "$APP_TS"
  echo "[inject] import healthRouter agregado en $APP_TS"
fi

# 3) Insertar app.use para montar rutas si no existe
if ! grep -q "app.use(healthRouter)" "$APP_TS"; then
  # Buscar la línea donde se define "const app = express()" y después insertar el use
  if grep -q "const app = express()" "$APP_TS"; then
    sed -E -i "/const app = express\(\)/a \
app.use(healthRouter);" "$APP_TS"
    echo "[inject] app.use(healthRouter) agregado después de const app = express()"
  else
    # Como fallback, añadir al final del archivo
    printf "
// [inject-health] Montar rutas de salud\napp.use(healthRouter);\n" >> "$APP_TS"
    echo "[inject] app.use(healthRouter) agregado al final de $APP_TS (fallback)"
  fi
fi

echo "Listo. Compila y corre tu servicio; ahora tienes /salud, /live y /ready."
