# Synthetic & SLA Monitoring

Incluye:
- **Blackbox Exporter** para uptime/latencia synthetic.
- **Prometheus**: scrape + alerta `EndpointDownSynthetic`.
- **Grafana**: dashboard de uptime.
- **k6**: prueba de humo para `/salud` (p95 < 500ms).

## Uso
1) Ejecuta **blackbox-exporter** (agrega a tu docker-compose):
   ```yaml
   services:
     blackbox-exporter:
       image: prom/blackbox-exporter:latest
       ports: ["9115:9115"]
       volumes:
         - ./blackbox/blackbox.yml:/etc/blackboxexporter/config.yml
       command: ["--config.file=/etc/blackboxexporter/config.yml"]
   ```
2) En **Prometheus**, añade el job de `prometheus/blackbox_scrape.yml` y las alertas `prometheus/alerts-synthetic.yml`.
3) Importa **Grafana** → `dashboards/grafana/uptime.json`.
4) Corre **k6**:
   ```bash
   BASE_URL=https://tu-api.com k6 run k6/tests/smoke.js
   ```
