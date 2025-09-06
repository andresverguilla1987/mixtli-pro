# Mixtli — PROD CLEAN
Solo endpoints de producción: health + auth (register/login/me/refresh). Sin rutas de diagnóstico.

## Estructura
server.js
src/
  server.cjs
  rutas/
    auth.cjs

## Render
Start Command: `node server.js`
Env: `DATABASE_URL`, `JWT_SECRET`

## Endpoints
GET  /api/health
POST /api/auth/register   { email, password }
POST /api/auth/login      { email, password }
GET  /api/auth/me         Authorization: Bearer <accessToken>
POST /api/auth/refresh    { refreshToken }
