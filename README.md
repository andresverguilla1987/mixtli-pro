# Mixtli Backend (PRO)

Backend sencillo en Node.js + Express, listo para Railway.

## Endpoints
- `GET /health` – Healthcheck
- `GET /` – Página simple (texto)
- `GET /api/ping` – Responde `pong`

## Variables de entorno
Copia `.env.example` a las variables de Railway y rellena **con tus valores reales**.

## Scripts
- `npm start` – Ejecuta el servidor
- `npm run dev` – Modo desarrollo (watch)
- `npm run prisma:generate` – Genera Prisma Client
- `npm run prisma:migrate` – Aplica migraciones en producción
