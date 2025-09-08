#!/usr/bin/env bash
set -euo pipefail

: "${DATABASE_URL_STAGING:?Falta DATABASE_URL_STAGING}"
export SAFE_EMAIL_SUFFIX="${SAFE_EMAIL_SUFFIX:-@mixtli.test}"
export DRY_RUN="${DRY_RUN:-false}"

# Instalar pg si no existe
if ! command -v psql >/dev/null 2>&1; then
  echo "Instala psql primero (PostgreSQL client)"
  exit 1
fi

# Instalar pg para node si es necesario (usando npx)
if ! node -e "require('pg');" >/dev/null 2>&1; then
  echo "Instalando dependencia temporal 'pg'..."
  npm i --no-save pg >/dev/null
fi

node db/sanitize-staging.js
echo "Listo ✅"
