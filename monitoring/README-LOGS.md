# Logs con Loki + Promtail

## Levantar
```bash
docker compose -f docker-compose.logs.yml up -d
```
- Loki: `:3100`
- Promtail: `:9080` (status)

Grafana ya tiene datasource **Loki** (provisionado). Paneles en carpeta **Logs**.
Para contar 4xx/5xx con LogQL (ejemplo):
```
sum(rate({compose_service="mixtli_api"} | json | status >= 500 [1m]))
```
Si no tienes logs JSON, ajusta el pipeline en promtail para parsear.
