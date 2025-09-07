#!/usr/bin/env bash
set -euo pipefail
IP="${1:-}"
PORT="${2:-5432}"
if [[ -z "$IP" ]]; then
  echo "Uso: $0 <IP_A_REVOCAR> [PUERTO]"; exit 1
fi
echo "[RUN] ufw delete allow from ${IP} to any port ${PORT} proto tcp"
ufw delete allow from "${IP}" to any port "${PORT}" proto tcp
ufw status numbered
