# Autopatch v2 — Sentry v8 + Redis
1) Copia este ZIP al repo manteniendo rutas.
2) En Render → Build Command, usa algo así (simplificado):
   bash -lc "bash render/render-build-autopatch.sh && cd apps/api && if [ -f package-lock.json ]; then npm ci; else npm i; fi && npx prisma generate && npm run build"
3) (Opcional) Start con instrumentación temprana:
   cd apps/api && npx prisma migrate deploy && node --import ./dist/sentry/instrument.js dist/server.js
4) Variables:
   - SENTRY_DSN
   - REDIS_URL (si no la defines, tu app arranca igual y el helper no intentará Redis)
