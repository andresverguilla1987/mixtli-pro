# Mixtli API PRO (server-upload)

Incluye:
- Cache-Control fuerte para imágenes (1 año, immutable)
- Token opcional (`x-mixtli-token`)
- Allowlist MIME y límite de tamaño
- Prefijo de key
- Rate limiting por IP/token
- OpenAPI/Swagger en `/docs` (JSON en `/openapi.json`)
- Métricas Prometheus en `/metrics`
- Readiness en `/ready` (prueba acceso a R2)

## Deploy (GitHub → Render)
1) Sube esta carpeta a tu repo.
2) Render → Blueprint (usa `render.yaml`) o Web Service:
   - Build: `npm ci --omit=dev`
   - Start: `node server.js`
3) Env vars:
```
PORT=10000
ALLOWED_ORIGIN=https://lovely-bienenstitch-6344a1.netlify.app
API_TOKEN=<opcional>
ALLOWED_MIME=image/jpeg,image/png,image/webp,image/gif
MAX_BYTES=200mb
KEY_PREFIX=uploads
RATE_LIMIT_PER_MIN=100
R2_ACCOUNT_ID=...
R2_BUCKET=...
R2_REGION=auto
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
PUBLIC_BASE_URL=https://pub-<hash>.r2.dev   # o tu CDN (cdn.mixtli.app)
```

## Endpoints
- `GET /api/health`
- `POST /api/upload?filename=&contentType=` (body binario)
- `GET /api/signget?key=&expires=`
- `GET /docs` (Swagger)
- `GET /metrics` (Prometheus)
- `GET /ready`

