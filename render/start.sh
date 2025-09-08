#!/usr/bin/env bash
set -euo pipefail
pushd apps/api >/dev/null
npx prisma migrate deploy
if [ -f dist/server.js ]; then
  ENTRY=dist/server.js
elif [ -f dist/index.js ]; then
  ENTRY=dist/index.js
else
  ENTRY=dist/app.js
fi
node "$ENTRY"
popd >/dev/null
