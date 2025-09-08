#!/usr/bin/env bash
set -euo pipefail
: "${CRON_KEY:?CRON_KEY no definido}"
: "${DEMO_REFRESH_URL:?DEMO_REFRESH_URL no definido}"

echo "[cron] Invocando $DEMO_REFRESH_URL …"
# Lanza el refresh y falla si no devuelve 2xx
curl -fsS -X POST "$DEMO_REFRESH_URL"       -H "x-cron-key: $CRON_KEY"       -H "Content-Type: application/json"       --data '{}'
echo
echo "[cron] OK"
