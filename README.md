# Mixtli – Mega Pack 01

Incluye CI/CD (Newman + Deploy Render + Healthcheck + Slack + métricas), Auth básico (register/login/JWT),
migración Prisma para `passwordHash`, colección Postman y `.env.example` listo.

## Estructura
```
.github/workflows/ci.yml
guiones/run-tests.sh
.env.example
server.js
prisma/schema.prisma
prisma/migrations/2025-08-24_add_passwordhash/migration.sql
cartero/mixtli-auth-basic.postman_collection.json
cartero/mixtli-auth-basic.postman_environment.json
```

## Pasos
1) Sube todo a la raíz del repo (reemplaza `server.js` y `prisma/schema.prisma` si te pregunta).
2) Render → servicio → **Environment**: define `JWT_SECRET`, `DATABASE_URL`, `PORT=10000`.
3) Render → servicio → **Manual Deploy** (Clear build cache & deploy).
4) Render → **Shell**:
```
npx prisma generate
npx prisma migrate deploy
```
5) Postman: importa `cartero/*.json` y prueba Auth (register/login/me).
6) GitHub → Settings → Secrets:
   - `DATABASE_URL`, `RENDER_API_KEY`, `RENDER_SERVICE_ID`, `SLACK_WEBHOOK_URL`.
7) GitHub → Actions: correr workflow. Ver métricas en Slack y reportes en Artifacts.

Listo. ¡A producir!
