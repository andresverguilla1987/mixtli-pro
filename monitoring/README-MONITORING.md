# Monitoring & Alerting

## Levantar el stack
```bash
docker compose -f docker-compose.prod.yml up -d --build   # app
docker compose -f docker-compose.monitor.yml up -d        # monitoreo
```
- Prometheus → http://localhost:9090
- Grafana → http://localhost:3000 (admin/admin)
- Alertmanager → http://localhost:9093

## Dashboards
Grafana provisona el datasource Prometheus y el dashboard `Mixtli API` automáticamente.

## Alertas
- `alerts.yml` contiene: InstanceDown, ApiHighErrorRate, HighContainerCPU.
- Configura SMTP real en `monitoring/alertmanager.yml` para correos.
