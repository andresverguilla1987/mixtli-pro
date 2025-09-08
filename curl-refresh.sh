#!/usr/bin/env bash
# Uso: DEMO_CRON_SECRET=xxx ./curl-refresh.sh
set -euo pipefail
: "${DEMO_CRON_SECRET:?Falta DEMO_CRON_SECRET en el entorno}"
curl -i -X POST "https://mixtli-pro.onrender.com/api/refresh"       -H "Authorization: Bearer $DEMO_CRON_SECRET"
