#!/usr/bin/env bash
set -e

usage() {
  cat <<'EOF'
Mixtli V8.2 – bootstrap

USO:
  ./bootstrap.sh local:prod            # compose con Nginx en contenedor
  ./bootstrap.sh local:no-nginx        # compose sin Nginx (host Nginx/TLS)
  ./bootstrap.sh local:managed-db      # usa DATABASE_URL externa
  ./bootstrap.sh monitoring            # Prometheus/Grafana/Alertmanager
  ./bootstrap.sh logs                  # Loki + Promtail
  ./bootstrap.sh render:info           # tips para Render Blueprint
  ./bootstrap.sh fly:info              # tips para Fly.io
  ./bootstrap.sh do:tf                 # Terraform DigitalOcean
  ./bootstrap.sh aws:tf                # Terraform AWS
  ./bootstrap.sh gcp:tf                # Terraform GCP
  ./bootstrap.sh ansible:setup         # Hardening + deploy
  ./bootstrap.sh tunnel:info           # Cloudflare Tunnel
  ./bootstrap.sh help

Notas:
- Edita .env.prod con tus secrets antes de levantar.
- Requiere docker y docker compose.
EOF
}

ensure_compose() {
  if ! command -v docker >/dev/null; then echo "ERROR: docker no encontrado"; exit 1; fi
  if ! docker compose version >/dev/null 2>&1; then echo "ERROR: docker compose no encontrado"; exit 1; fi
}

cmd="${1:-help}"
case "$cmd" in
  local:prod)
    ensure_compose
    docker compose -f docker-compose.prod.yml up -d --build
    echo "➡ Health: http://localhost/health"
    ;;
  local:no-nginx)
    ensure_compose
    docker compose -f docker-compose.prod.no-nginx.yml up -d --build
    echo "➡ Recuerda emitir TLS en el host con certbot."
    ;;
  local:managed-db)
    ensure_compose
    if [[ -z "${DATABASE_URL:-}" ]]; then echo "Necesitas exportar DATABASE_URL"; exit 1; fi
    docker compose -f docker-compose.prod.managed-db.yml up -d --build
    ;;
  monitoring)
    ensure_compose
    docker compose -f docker-compose.monitor.yml up -d
    echo "Prometheus :9090 | Grafana :3000 | Alertmanager :9093"
    ;;
  logs)
    ensure_compose
    docker compose -f docker-compose.logs.yml up -d
    echo "Loki :3100 | Promtail :9080"
    ;;
  render:info)
    echo "Render Blueprint → usa render.yaml. Configura JWT_SECRET, SENDGRID_*. Crea DB/Redis desde el blueprint si procede."
    ;;
  fly:info)
    echo "Fly.io → deploy/fly/*. Crea apps (api/worker), Postgres y Redis. Ejecuta: fly deploy -c deploy/fly/fly.api.toml"
    ;;
  do:tf)
    echo "DigitalOcean Terraform → deploy/terraform/do. Ejecuta: terraform init && terraform apply -auto-approve"
    ;;
  aws:tf)
    echo "AWS Terraform → deploy/terraform/aws. Define terraform.tfvars y ejecuta: terraform init && terraform apply -auto-approve"
    ;;
  gcp:tf)
    echo "GCP Terraform → deploy/terraform/gcp. Define terraform.tfvars y ejecuta: terraform init && terraform apply -auto-approve"
    ;;
  ansible:setup)
    if ! command -v ansible >/dev/null; then echo "Instala Ansible (apt install ansible)"; exit 1; fi
    (cd deploy/ansible && make setup)
    ;;
  tunnel:info)
    echo "Cloudflare Tunnel → deploy/cloudflare-tunnel/README-CFTUNNEL.md"
    ;;
  help|*)
    usage
    ;;
esac
