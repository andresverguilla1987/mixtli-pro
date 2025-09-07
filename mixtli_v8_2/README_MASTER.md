# Mixtli V8.2 – SuperBundle (A–C)

**Incluye todo listo para producción y multi‑cloud:**

- A) **WFM What‑If** (`POST /wfm/simulate`)
- B) **Reentrenamiento Scoring** (`POST /scoring/retrain` vía BullMQ)
- C) **Auditoría total** (`/rules`, `/audit/logs`) + OpenAPI `/openapi.yaml`
- **Monorepo PNPM** (API + Worker) con **Prisma**, **Postgres**, **Redis**
- **Nginx** (contenedor) y variantes con **Nginx en host** + **TLS Let’s Encrypt**
- **Render Blueprint**, **Fly.io**, **Railway**
- **Terraform** para **DigitalOcean**, **AWS EC2 (+RDS/Proxy)**, **GCP Compute (+Cloud SQL)**
- **Cloudflare Tunnel** (sin puertos abiertos)
- **DNS‑01** para Cloudflare/Route53 (comodines)
- **Ansible** (hardening + deploy)
- **Observabilidad**: Prometheus + Grafana + Alertmanager + Loki/Promtail, métricas `/metrics` p95/p99
- **CI/CD** (GitHub Actions): lint, tests, build, promtool, deploy a Render

## Arranque rápido (local)

### Opción 1: Full stack con Nginx en contenedor
```bash
docker compose -f docker-compose.prod.yml up -d --build
curl -s http://localhost/health
```

### Opción 2: Nginx en host + TLS (HTTP‑01)
1. Apunta `api.tu-dominio.com` a tu VM.
2. Usa compose sin Nginx:
```bash
docker compose -f docker-compose.prod.no-nginx.yml up -d --build
```
3. Emite TLS:
```bash
sudo certbot --nginx -n --agree-tos -m admin@tu-dominio.com -d api.tu-dominio.com
```

### Opción 3: DB gestionada (RDS/Cloud SQL)
- Exporta `DATABASE_URL` a tu DB gestionada y:
```bash
docker compose -f docker-compose.prod.managed-db.yml up -d --build
```

## Observabilidad
```bash
# Prometheus, Grafana, Alertmanager, cAdvisor, Node Exporter
docker compose -f docker-compose.monitor.yml up -d
# Loki + Promtail
docker compose -f docker-compose.logs.yml up -d
```
Grafana: `http://localhost:3000` (usuario `admin`, pass `admin` → cámbiala).  
Dashboards: **Mixtli API**, **Mixtli API Latency**, **Mixtli SLO**, **Mixtli Logs**.

## Despliegues cloud (atalayos)
- **Render**: `render.yaml` (Blueprint). Configura secrets (`JWT_SECRET`, `SENDGRID_*`).
- **Fly.io**: `deploy/fly/*` (API+Worker). Crea apps, Postgres y Redis, y `fly deploy -c ...`.
- **Railway**: ver `deploy/railway/README-RAILWAY.md` (Dockerfile api/worker).
- **Terraform**:
  - **DigitalOcean**: `deploy/terraform/do/*` (VM con Docker + Nginx + systemd + Tailscale)
  - **AWS**: `deploy/terraform/aws/*` (EC2 + Nginx + Certbot + opcional RDS y RDS Proxy)
  - **GCP**: `deploy/terraform/gcp/*` (VM + Nginx + Certbot + Cloud SQL)

## Seguridad y TLS
- **Ansible**: `deploy/ansible` → `make setup` instala Docker, UFW/Fail2ban, Nginx, Certbot y levanta compose.
- **DNS‑01** (comodines): `deploy/tls/dns01/README-DNS01.md`.
- **Cloudflare Tunnel**: `deploy/cloudflare-tunnel/README-CFTUNNEL.md`.

## CI/CD (GitHub)
- CI básico: `.github/workflows/ci.yml`
- Deploy Render: `.github/workflows/deploy-render.yml` (define `RENDER_API_KEY` y service IDs)
- CI observabilidad: `.github/workflows/ci-observability.yml`

---

## Estructura (resumen)
- `apps/api` (Express + Prisma + metrics + Sentry)
- `apps/worker` (BullMQ + Prisma)
- `docker-compose.*.yml` (prod, sin nginx, managed-db, monitor, logs)
- `deploy/*` (terraform, ansible, tls, cloudflare-tunnel)
- `monitoring/*` y `logging/*` (configs Prometheus/Grafana/Alertmanager/Loki/Promtail)
