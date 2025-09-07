#!/usr/bin/env bash
set -euo pipefail
IP="${1:-}"
PORT="${2:-5432}"
if [[ -z "$IP" ]]; then
  echo "Uso: $0 <IP_PERMITIDA> [PUERTO]"; exit 1
fi
echo "[RUN] ufw allow from ${IP} to any port ${PORT} proto tcp"
ufw allow from "${IP}" to any port "${PORT}" proto tcp
ufw status numbered
