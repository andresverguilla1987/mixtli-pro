# Mixtli Pro API (Express + Prisma)

API mínima lista para Render.

## Variables de entorno necesarias (Render → Environment)
- `DATABASE_URL` → URL completa de Postgres (Render te da una si creas una DB). Ejemplo:
  `postgresql://usuario:password@dpg-xxxxx.render.com/mixtli_db?schema=public`
- `PORT` → `10000` (Render inyecta, pero lo dejamos fijo para evitar líos).

## Comandos recomendados en Render
- **Build Command**: `npm install && npx prisma generate`
- **Pre-Deploy Command**: `npm run prisma:push`  (si tu plan lo permite; si no, puedes correrlo manual en shell)
- **Start Command**: `node src/server.js`

## Endpoints
- `GET /` → health JSON
- `GET /salud` → ping sencillo
- `GET /api/users` → lista usuarios
- `POST /api/users` → crea usuario `{ name, email, password }`

## Local
```bash
npm install
npx prisma db push
npm run dev
```
