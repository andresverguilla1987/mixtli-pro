# Logs & Loki Pack

## Qué hace
- **Promtail** con pipeline para **Pino (JSON)**: extrae `level`, `requestId`, `route`, `status` como **labels**.
- Scrapea **logs de Docker** (`/var/lib/docker/containers/*/*-json.log`).

## Uso
1) Sustituye tu `promtail-config.yaml` por `promtail-docker-config.yaml` o añade un job adicional.
2) Ejecuta con tu stack (Loki ya está en el pack principal).
3) En Grafana, usa el datasource **Loki** y filtra, por ejemplo:
   ```
   {job="docker", level="error"} |= "Prisma"
   ```
   o filtra por correlación:
   ```
   {job="docker", requestId="demo-123"}
   ```
