#!/usr/bin/env bash
set -euo pipefail
echo "[start] migrate + boot"
cd apps/api
npx prisma migrate deploy

# Pick entrypoint
ENTRY=""
for f in dist/server.js dist/index.js dist/app.js; do
  if [ -f "$f" ]; then ENTRY="$f"; break; fi
done
if [ -z "$ENTRY" ]; then
  echo "[start] No entrypoint in dist/"
  ls -la dist || true
  exit 1
fi

echo "[start] entry=$ENTRY"
# Run with preloaded redis stub
exec node --import ./dist/disable-redis.mjs "$ENTRY"
