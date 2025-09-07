#!/usr/bin/env bash
set -euo pipefail
# Uso: exporta variables y corre: ./set_github_secrets.sh <user|org> <repo>
USER_ORG="${1:-}"
REPO="${2:-}"
if [[ -z "$USER_ORG" || -z "$REPO" ]]; then
  echo "Uso: $0 <user|org> <repo>"
  echo "Requiere env vars (export antes de correr):"
  echo "  RENDER_API_KEY, RENDER_SERVICE_API_ID, RENDER_SERVICE_WORKER_ID (opcional)"
  echo "  SENTRY_DSN (opcional)"
  echo "  SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, ALERTS_TO, ALERTS_FROM (opcional)"
  exit 1
fi

if ! command -v gh >/dev/null; then echo "Instala GitHub CLI (gh)"; exit 1; fi

REPO_SLUG="${USER_ORG}/${REPO}"
add_secret() { local k="$1"; local v="$2"; if [[ -n "${v:-}" ]]; then echo "$v" | gh secret set "$k" -R "$REPO_SLUG"; fi; }

add_secret RENDER_API_KEY "${RENDER_API_KEY:-}"
add_secret RENDER_SERVICE_API_ID "${RENDER_SERVICE_API_ID:-}"
add_secret RENDER_SERVICE_WORKER_ID "${RENDER_SERVICE_WORKER_ID:-}"
add_secret SENTRY_DSN "${SENTRY_DSN:-}"

# Alertmanager SMTP (si quieres notificaciones)
add_secret SMTP_HOST "${SMTP_HOST:-}"
add_secret SMTP_PORT "${SMTP_PORT:-}"
add_secret SMTP_USER "${SMTP_USER:-}"
add_secret SMTP_PASS "${SMTP_PASS:-}"
add_secret ALERTS_TO "${ALERTS_TO:-}"
add_secret ALERTS_FROM "${ALERTS_FROM:-}"

echo "✅ Secrets configurados en $REPO_SLUG (los que tuviste exportados)."
