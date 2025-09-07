#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

# Load ports
PORTS="$(tr -s ' ' < ports.conf | tr '\n' ' ' | sed 's/^ *//;s/ *$//')"
if [[ -z "${PORTS}" ]]; then
  echo "No hay puertos en ports.conf"; exit 1
fi

# Detect public IP (multiple fallbacks)
detect_ip() {
  IP=""
  if command -v curl >/dev/null 2>&1; then
    IP="$(curl -s https://ifconfig.me || true)"
    [[ -z "$IP" ]] && IP="$(curl -s https://api.ipify.org || true)"
  fi
  if [[ -z "$IP" ]] && command -v dig >/dev/null 2>&1; then
    IP="$(dig +short myip.opendns.com @resolver1.opendns.com || true)"
  fi
  if [[ -z "$IP" ]]; then
    echo "No pude detectar tu IP pública. Pásala manual: sudo bash $0 X.X.X.X"; exit 1
  fi
  echo "$IP"
}

TARGET_IP="${1:-}"
if [[ -z "${TARGET_IP}" ]]; then
  TARGET_IP="$(detect_ip)"
fi

echo "==> Permitirá acceso desde IP: ${TARGET_IP} a puertos: ${PORTS}"
apt-get update -y >/dev/null 2>&1 || true
apt-get install -y ufw >/dev/null 2>&1 || true

for P in ${PORTS}; do
  echo "[RUN] ufw allow from ${TARGET_IP} to any port ${P} proto tcp"
  ufw allow from "${TARGET_IP}" to any port "${P}" proto tcp
done

echo "==> Habilitando UFW (si no lo estaba)"
ufw --force enable

# Save a record for easy revoke
mkdir -p .state
echo "${TARGET_IP}" > .state/last_ip.txt
echo "${PORTS}" > .state/last_ports.txt

echo "Listo. Reglas actuales:"
ufw status numbered
