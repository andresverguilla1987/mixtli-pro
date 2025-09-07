# Mixtli V8.2 (A–C) – Prod Bundle

Incluye:
- **A)** Simulador WFM (what‑if) con asignación ligera tipo ILP (`POST /wfm/simulate`)
- **B)** Reentrenamiento de scoring encolado por worker (`POST /scoring/retrain`)
- **C)** Auditoría completa de cambios y aprobaciones (`/rules`, `/audit/logs`)
- OpenAPI en `/openapi.yaml`
- Prisma + Postgres + Redis
- Nginx reverse proxy
- Seed de admin

## Quickstart

1) Copia las variables:
```bash
cp .env.prod .env.prod.local # (opcional) o edita .env.prod directamente
```
2) Levanta en producción:
```bash
docker compose -f docker-compose.prod.yml up -d --build
```

3) (Opcional) Ejecuta seed del admin si no arrancó automáticamente:
```bash
# Dentro del contenedor api
docker exec -it mixtli_api sh -lc "node -v && npx prisma migrate deploy && pnpm seed"
```

## Endpoints
- `GET /health`
- `POST /wfm/simulate`
- `POST /scoring/retrain`
- `POST /rules`
- `PUT /rules/{id}/approve`
- `GET /audit/logs`
- `GET /openapi.yaml`

## Ejemplos rápidos

### A) Simulación WFM
```bash
curl -s http://localhost:8080/wfm/simulate -X POST -H 'content-type: application/json' -d '{
  "agents":[{"id":"a1","availability":[{"startMin":540,"endMin":1020}]},{"id":"a2","availability":[{"startMin":600,"endMin":900}]}],
  "slots":[{"startMin":600,"endMin":660,"demand":2},{"startMin":660,"endMin":720,"demand":1}]
}'
```

### B) Reentrenar
```bash
curl -s http://localhost:8080/scoring/retrain -X POST -H 'content-type: application/json' -d '{"reason":"fraud_feedback"}'
```

### C) Reglas + Auditoría
```bash
curl -s http://localhost:8080/rules -X POST -H 'content-type: application/json' -d '{"name":"rule1","content":{"threshold":0.7},"actor":"andres"}'
```

## Notas
- Llena `SENDGRID_*` si vas a notificar por correo desde el worker.
- Edita `SEED_ADMIN_*` antes de correr en producción.
