# Mixtli Pro (root limpio para Render)

Estructura en **raíz** del repo para que Render detecte `package.json` sin broncas.

## Variables de entorno (Render → Environment)
- `DATABASE_URL` = **External Database URL** de tu Postgres con `?sslmode=require`
- `PORT` = `10000`
(Activa el candado "Available during build" para ambas.)

## Comandos (Render → Settings → Build & Deploy)
- **Build Command**
  ```bash
  npm install && npx prisma generate
  ```
- **Pre-Deploy Command** (si tu plan lo permite)
  ```bash
  npx prisma migrate deploy && node prisma/seed.js
  ```
  > Si no tienes Pre-Deploy, puedes usar en Build:
  > `npm install && npx prisma generate && npx prisma migrate deploy && node prisma/seed.js`
- **Start Command**
  ```bash
  node src/server.js
  ```

## Endpoints
- `GET /` → bienvenida y rutas
- `GET /salud`
- `GET /api/users`
- `POST /api/users`  `{ name, email, password }`
