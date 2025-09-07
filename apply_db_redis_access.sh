#!/usr/bin/env bash
set -euo pipefail
IP="${1:-}"
if [[ -z "$IP" ]]; then echo "Uso: $0 <IP_PERMITIDA>"; exit 1; fi
echo "[RUN] ufw allow from ${IP} to any port 5432 proto tcp"
ufw allow from "${IP}" to any port 5432 proto tcp
echo "[RUN] ufw allow from ${IP} to any port 6379 proto tcp"
ufw allow from "${IP}" to any port 6379 proto tcp
ufw status numbered
