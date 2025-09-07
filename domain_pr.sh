#!/usr/bin/env bash
set -euo pipefail
# Uso:
#  ./domain_pr.sh <domain> <repo_path> [--dns=cloudflare|route53|none] [--tls=http01|dns01|tunnel] [--render-cname=<host.onrender.com>]
DOMAIN="${1:-}"
REPO="${2:-}"
DNS_PROVIDER="cloudflare"
TLS_MODE="http01"
RENDER_CNAME=""
for arg in "${@:3}"; do
  case "$arg" in
    --dns=*) DNS_PROVIDER="${arg#--dns=}";;
    --tls=*) TLS_MODE="${arg#--tls=}";;
    --render-cname=*) RENDER_CNAME="${arg#--render-cname=}";;
  esac
done
if [[ -z "$DOMAIN" || -z "$REPO" ]]; then
  echo "Uso: $0 <domain> <repo_path> [--dns=cloudflare|route53|none] [--tls=http01|dns01|tunnel] [--render-cname=<host.onrender.com>]"
  exit 1
fi

cd "$REPO"

branch="infra/domain-${DOMAIN//./-}"
git checkout -b "$branch" || git checkout "$branch"

# 1) Ansible group vars
GV="deploy/ansible/group_vars/all.yml"
if [[ -f "$GV" ]]; then
  sed -i.bak -E "s|^domain:.*$|domain: "${DOMAIN}"|g" "$GV"
  case "$TLS_MODE" in
    dns01) sed -i -E "s|^tls_provider:.*$|tls_provider: "cloudflare"|g" "$GV" ;;
    tunnel|http01) sed -i -E "s|^tls_provider:.*$|tls_provider: "${TLS_MODE}"|g" "$GV" ;;
  esac
fi

# 2) Docs/examples replacements (non-destructive)
grep -rl "api.tu-dominio.com" . | xargs -r sed -i -E "s|api\.tu-dominio\.com|${DOMAIN}|g"

# 3) Render custom domain doc
if [[ -n "$RENDER_CNAME" ]]; then
  sed -i -E "s|<target>\.onrender\.com|${RENDER_CNAME}|g" RENDER_CUSTOM_DOMAIN.md || true
fi

# 4) Add Cloudflare DNS terraform (already included)
git add .
git commit -m "chore: set domain ${DOMAIN} (dns=${DNS_PROVIDER}, tls=${TLS_MODE}) and docs"
echo "✔ Domain files updated -> ${DOMAIN}"
echo "Siguiente:"
echo "  gh pr create --title "Domain: ${DOMAIN} + Cloudflare proxied" --body-file ../PR_BODY_DOMAIN.md --base main --head ${branch}"
