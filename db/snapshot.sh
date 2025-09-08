
#!/usr/bin/env bash
set -euo pipefail

mkdir -p snapshots
DATE=$(date -u +%Y%m%d-%H%M%S)
NAME="snapshots/snapshot-$DATE.sql"

: "${DATABASE_URL:?DATABASE_URL no está seteada}"

echo "Creando snapshot en $NAME ..."
pg_dump --no-owner --no-privileges --format=plain -d "$DATABASE_URL" -f "$NAME"
echo "Listo: $NAME"
