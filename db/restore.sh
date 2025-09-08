#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "[restore] ERROR: DATABASE_URL no está definido en el entorno."
  exit 1
fi

if ! command -v psql >/dev/null 2>&1; then
  echo "[restore] ERROR: psql no está instalado en este entorno."
  exit 1
fi

if [[ $# -lt 1 ]]; then
  echo "Uso: bash db/restore.sh <archivo.sql>"
  exit 1
fi

IN="$1"
if [[ ! -f "$IN" ]]; then
  echo "[restore] ERROR: archivo no encontrado: $IN"
  exit 1
fi

echo "[restore] Restaurando desde $IN ..."
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$IN"
echo "[restore] Done."
