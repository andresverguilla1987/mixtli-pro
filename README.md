# Mixtli Corrector (Producción)
- Entrypoint CJS con shim (`server.js` -> `src/server.cjs`).
- Rutas `/api/auth/*` fijas al delegate Prisma `prisma.usuario` (según tu schema).
- JWT con `JWT_SECRET` desde Environment.

## Estructura
server.js
src/
  server.cjs
  rutas/
    auth.cjs

## Render
- **Start Command**: `node server.js` (o `node src/server.cjs` si no usas el shim).
- **Env**: `DATABASE_URL`, `JWT_SECRET`.

## Endpoints
- GET `/api/health`
- POST `/api/auth/register` { email, password, name? }
- POST `/api/auth/login` { email, password }
- POST `/api/auth/refresh` { refreshToken }
- GET  `/api/auth/me`   (Authorization: Bearer <accessToken>)
