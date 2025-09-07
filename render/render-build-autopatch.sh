#!/usr/bin/env bash
set -euo pipefail

echo "[autopatch] Sentry & Redis migration starting..."
# Ejecuta migradores sobre el source antes de compilar
node scripts/migrate-sentry-v8.js apps/api/src/app.ts || true
node scripts/migrate-redis-url.js apps/api/src || true
echo "[autopatch] Done. Proceeding with your build..."
