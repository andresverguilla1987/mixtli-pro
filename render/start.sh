#!/usr/bin/env bash
set -euo pipefail
cd apps/api
npx prisma migrate deploy
if [ -f dist/server.js ]; then
  node dist/server.js
elif [ -f dist/index.js ]; then
  node dist/index.js
else
  node dist/app.js
fi
