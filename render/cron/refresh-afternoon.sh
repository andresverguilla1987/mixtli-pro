#!/usr/bin/env bash
# refresh-afternoon.sh — dispara el refresh de demo por la tarde
# Requisitos de entorno:
#   - REFRESH_URL (opcional): URL completa del endpoint /api/refresh.
#       Ej: https://mixtli-pro.onrender.com/api/refresh
#     Si no se define, se construye con $PUBLIC_URL si existe.
#   - PUBLIC_URL (opcional): URL base pública de tu API (sin slash final).
#   - DEMO_REFRESH_TOKEN (obligatorio): token del refresh (el mismo que configuraste en el API).
#
# Uso en Render Cron Job (Command):
#   bash -lc "bash render/cron/refresh-afternoon.sh"
set -euo pipefail

: "${DEMO_REFRESH_TOKEN:?DEMO_REFRESH_TOKEN es requerido}"

if [[ -z "${REFRESH_URL:-}" ]]; then
  if [[ -n "${PUBLIC_URL:-}" ]]; then
    REFRESH_URL="${PUBLIC_URL%/}/api/refresh"
  else
    # valor por defecto (ajústalo si tu URL cambia)
    REFRESH_URL="https://mixtli-pro.onrender.com/api/refresh"
  fi
fi

echo "[cron] Disparando refresh: $REFRESH_URL"
curl -fsS -X POST "$REFRESH_URL"       -H "Authorization: Bearer $DEMO_REFRESH_TOKEN"       -H "X-Refresh-Token: $DEMO_REFRESH_TOKEN"       -H "Content-Type: application/json"       --max-time "${CURL_TIMEOUT:-25}"

echo
echo "[cron] OK"
