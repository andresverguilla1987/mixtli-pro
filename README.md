# Mixtli Pro — Fake API (Express)

API mínima para probar despliegue en Render.

## Endpoints
- `GET /` → estado del servidor
- `GET /usuarios` → lista de usuarios fake
- `GET /productos` → lista de productos fake

## Despliegue en Render
- Build Command: `npm install`
- Start Command: `node src/server.js`
- Environment → Variables:
  - `PORT` (Render la define automáticamente)
  - (Opcional) otras que ocupes

