#!/usr/bin/env bash
set -euo pipefail
cd apps/api

# 1) Run migrations
npx prisma migrate deploy

# 2) Strip Sentry v7 Handlers from compiled JS if they exist (idempotent)
TARGETS=(
  "./dist/app.js"
  "./dist/server.js"
  "./dist/index.js"
)
for f in "${TARGETS[@]}"; do
  if [ -f "$f" ]; then
    # Remove requestHandler / tracingHandler / errorHandler lines if present
    tmp="${f}.tmp.$$"
    sed -e 's/app\.use(\s*Sentry\.Handlers\.requestHandler()\s*);\?//g'             -e 's/app\.use(\s*Sentry\.Handlers\.tracingHandler()\s*);\?//g'             -e 's/app\.use(\s*Sentry\.Handlers\.errorHandler()\s*);\?//g' "$f" > "$tmp" || true
    mv "$tmp" "$f"
  fi
done

# 3) (Opcional) si ya migraste a v8, agrega el setup nuevo si falta (no rompe si no existe)
if [ -f "./dist/app.js" ]; then
  if ! grep -q "setupExpressErrorHandler" "./dist/app.js"; then
    # Inserta un setup mínimo al final del archivo
    echo '\ntry { require("@sentry/node").setupExpressErrorHandler && require("@sentry/node").setupExpressErrorHandler(app); } catch (e) {}' >> "./dist/app.js"
  fi
fi

# 4) Arranca el server
node dist/server.js
