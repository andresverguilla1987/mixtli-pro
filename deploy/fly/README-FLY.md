# Fly.io Deploy

## 0) Requisitos
- `flyctl` instalado e iniciado: `fly auth login`
- Repo en GitHub (para CI opcional)

## 1) Crear apps y recursos
```bash
# API y Worker
fly apps create mixtli-api
fly apps create mixtli-worker

# Postgres administrado
fly postgres create --name mixtli-pg --initial-cluster-size 1 --vm-size shared-cpu-1x --volume-size 10

# Conectar DB a la API
fly postgres attach --app mixtli-api mixtli-pg

# Redis (Upstash)
fly redis create --name mixtli-redis
# (toma nota del REDIS_URL que imprime)
```

## 2) Variables/secrets
```bash
# API
fly secrets set --app mixtli-api JWT_SECRET=$(openssl rand -hex 32) SENDGRID_FROM=noreply@mixtli.local
fly secrets set --app mixtli-api SENDGRID_API_KEY=sg_xxx
# REDIS_URL para API y Worker (usa el valor que te dio el add-on)
fly secrets set --app mixtli-api REDIS_URL=redis://default:...upstash.io:6379
fly secrets set --app mixtli-worker REDIS_URL=redis://default:...upstash.io:6379

# Worker (si envías correos):
fly secrets set --app mixtli-worker SENDGRID_API_KEY=sg_xxx SENDGRID_FROM=noreply@mixtli.local
```

## 3) Despliegue
```bash
# API (desde el root del repo)
fly deploy -c deploy/fly/fly.api.toml

# Worker
fly deploy -c deploy/fly/fly.worker.toml
```

## 4) URLs y verificación
- API health: `https://<tu-app>.fly.dev/health`
- Logs: `fly logs -a mixtli-api` y `fly logs -a mixtli-worker`
