#!/usr/bin/env bash
set -euo pipefail

PROVIDER="${1:-}"
DOMAIN="${2:-}"
EMAIL="${3:-}"
CF_INI="${4:-/etc/letsencrypt/cloudflare.ini}"

if [[ -z "$PROVIDER" || -z "$DOMAIN" || -z "$EMAIL" ]]; then
  echo "Uso:"
  echo "  $0 <cloudflare|route53> <domain> <email> [cloudflare_ini_path]"
  exit 1
fi

case "$PROVIDER" in
  cloudflare)
    if [[ ! -f "$CF_INI" ]]; then
      echo "No existe $CF_INI"; exit 2
    fi
    certbot certonly --dns-cloudflare       --dns-cloudflare-credentials "$CF_INI"       -m "$EMAIL" --agree-tos -n       -d "$DOMAIN" -d "*.$DOMAIN"
    ;;
  route53)
    certbot certonly --dns-route53       -m "$EMAIL" --agree-tos -n       -d "$DOMAIN" -d "*.$DOMAIN"
    ;;
  *)
    echo "Proveedor no soportado: $PROVIDER"; exit 3
    ;;
esac

systemctl reload nginx || true
echo "Cert emitido para $DOMAIN (y *.$DOMAIN)."
