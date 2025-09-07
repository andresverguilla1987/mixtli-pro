# Render Setup (Mixtli API — Sentry v8)
Opción A — cambiar Start Command:
  cd apps/api && npx prisma migrate deploy && node --import ./dist/sentry/instrument.js dist/server.js

Opción B — mantener Start Command y usar NODE_OPTIONS:
  NODE_OPTIONS=--import ./dist/sentry/instrument.js

Asegura también:
  - SENTRY_DSN (tu DSN de Sentry)
  - SENTRY_TRACES_SAMPLE_RATE (p.ej. 0.2 en producción)
  - SENTRY_PROFILES_SAMPLE_RATE (opcional)
