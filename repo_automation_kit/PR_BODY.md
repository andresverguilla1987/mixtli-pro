# Bootstrap: Mixtli V8.2 SuperBundle

Este PR inicializa:
- Código A–C (WFM, retrain, auditoría, OpenAPI).
- Infra de despliegue (Render/Fly/Railway/DO/AWS/GCP), TLS (HTTP‑01/DNS‑01), Ansible.
- Observabilidad (Prometheus, Grafana, Alertmanager, Loki/Promtail), métricas p95/p99.
- CI (lint, tests, promtool, Docker build) y deploy a Render (vía API).

## Pendientes para merge
1. **Secrets** en GitHub Actions:
   - `RENDER_API_KEY`, `RENDER_SERVICE_API_ID`, `RENDER_SERVICE_WORKER_ID` (si usarás deploy a Render).
   - (Opcional) `SENTRY_DSN`, SMTP para Alertmanager.
2. Editar `.env.prod` antes de cualquier despliegue.
3. Configurar dominio y TLS según plataforma (ver `README_MASTER.md`).

> Al aprobar, queda **main** con todo listo. Se pueden crear PRs para customizar hosting y dominios.
