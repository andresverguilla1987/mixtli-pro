#!/usr/bin/env bash
set -euo pipefail

# Requiere: awscli, psql
# Vars necesarias:
#   AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION
#   S3_BUCKET (obligatoria)
#   S3_PREFIX (opcional: default mixtli/backups)
#   S3_KEY (opcional: si vacío se toma el más reciente)
#   DATABASE_URL_STAGING (obligatoria)

S3_PREFIX="${S3_PREFIX:-mixtli/backups}"

if [[ -z "${S3_BUCKET:-}" ]]; then
  echo "Falta S3_BUCKET"
  exit 1
fi
if [[ -z "${DATABASE_URL_STAGING:-}" ]]; then
  echo "Falta DATABASE_URL_STAGING"
  exit 1
fi

echo "Usando bucket s3://${S3_BUCKET}/${S3_PREFIX}/"
if [[ -z "${S3_KEY:-}" ]]; then
  echo "Resolviendo backup más reciente..."
  S3_KEY=$(aws s3 ls "s3://${S3_BUCKET}/${S3_PREFIX}/" | awk '{print $4}' | sort | tail -n1)
  if [[ -z "${S3_KEY:-}" ]]; then
    echo "No se encontró ningún backup en s3://${S3_BUCKET}/${S3_PREFIX}/"
    exit 1
  fi
fi

mkdir -p /tmp/mixtli
DEST="/tmp/mixtli/backup.sql"
echo "Descargando s3://${S3_BUCKET}/${S3_PREFIX}/${S3_KEY} ..."
aws s3 cp "s3://${S3_BUCKET}/${S3_PREFIX}/${S3_KEY}" "$DEST"

if [[ "${DROP_SCHEMA:-true}" == "true" ]]; then
  echo "Dropping schema público en STAGING..."
  psql "${DATABASE_URL_STAGING}" -v ON_ERROR_STOP=1 -c "DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;"
fi

echo "Restaurando backup en STAGING..."
psql "${DATABASE_URL_STAGING}" -v ON_ERROR_STOP=1 -f "$DEST"

if [[ -f "./db/seed.sql" ]]; then
  echo "Aplicando seed demo..."
  psql "${DATABASE_URL_STAGING}" -v ON_ERROR_STOP=1 -f "./db/seed.sql"
fi

echo "✅ Restore a STAGING completo."
