#!/usr/bin/env bash
set -euo pipefail
echo "[autopatch v2] Running..."
node scripts/migrate-sentry-v8.js apps/api/src/app.ts || true
node scripts/migrate-redis-url.js apps/api/src || true
echo "[autopatch v2] Done."
