
#!/usr/bin/env bash
set -euo pipefail

if [ $# -lt 1 ]; then
  echo "Uso: $0 s3://BUCKET/prefix/backup-YYYYmmdd-HHMMSS.sql"
  exit 1
fi

SQL_S3="$1"
: "${DATABASE_URL:?DATABASE_URL no está seteada}"

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

echo "Descargando $SQL_S3 ..."
aws s3 cp "$SQL_S3" "$TMP/dump.sql"

echo "Restaurando en $DATABASE_URL ..."
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$TMP/dump.sql"
echo "✔ Restore completado."
