# Mixtli Pro (API)

API Express + Prisma + PostgreSQL.

## Variables de entorno

- `DATABASE_URL`  (URL de Postgres en Render)
- `PORT`          (Render la inyecta)

## Endpoints
- `GET  /`                 -> health
- `GET  /api/users`        -> lista usuarios
- `POST /api/users`        -> crea usuario { name, email, password? }

## Deploy en Render
- Build Command: `npm install && npx prisma generate`
- Start Command: `node src/server.js`
