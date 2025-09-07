#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

if [[ ! -f .state/last_ip.txt || ! -f .state/last_ports.txt ]]; then
  echo "No hay estado previo (.state/*). Pasa IP y puertos manualmente."
  echo "Uso: sudo bash $0 <IP> [PUERTOS...]   # p.ej.: sudo bash $0 203.0.113.10 5432 6379"
  exit 1
fi

TARGET_IP="${1:-$(cat .state/last_ip.txt)}"
PORTS="${*:2}"
if [[ -z "${PORTS}" ]]; then
  PORTS="$(cat .state/last_ports.txt)"
fi

for P in ${PORTS}; do
  echo "[RUN] ufw delete allow from ${TARGET_IP} to any port ${P} proto tcp"
  ufw delete allow from "${TARGET_IP}" to any port "${P}" proto tcp || true
done

echo "Listo. Reglas actuales:"
ufw status numbered
