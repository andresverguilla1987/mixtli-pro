#!/usr/bin/env bash
set -euo pipefail

cd apps/api

if [ -f package-lock.json ]; then
  npm ci
else
  npm i
fi

# Asegurar prisma client (por si no se generó en build)
npx prisma generate

# Tipos de Express (opcional, no rompe si ya existen)
npm i -D @types/express || true
