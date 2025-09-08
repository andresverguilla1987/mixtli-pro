#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "[snapshot] ERROR: DATABASE_URL no está definido en el entorno."
  echo "  Exporta DATABASE_URL o configura GitHub Actions secret."
  exit 1
fi

if ! command -v pg_dump >/dev/null 2>&1; then
  echo "[snapshot] ERROR: pg_dump no está instalado en este entorno."
  exit 1
fi

mkdir -p snapshots
STAMP=$(date +"%Y-%m-%d-%H%M")
OUT="snapshots/${STAMP}.sql"

echo "[snapshot] Generando ${OUT} ..."
# Dump limpio, sin ownership ni privilegios, formato SQL plano.
pg_dump --clean --if-exists --no-owner --no-privileges "$DATABASE_URL" -F p > "$OUT"

echo "[snapshot] Listo: $OUT"
