#!/usr/bin/env bash
set -euo pipefail
IP="${1:-}"
if [[ -z "$IP" ]]; then echo "Uso: $0 <IP_A_REVOCAR>"; exit 1; fi
echo "[RUN] ufw delete allow from ${IP} to any port 5432 proto tcp"
ufw delete allow from "${IP}" to any port 5432 proto tcp || true
echo "[RUN] ufw delete allow from ${IP} to any port 6379 proto tcp"
ufw delete allow from "${IP}" to any port 6379 proto tcp || true
ufw status numbered
