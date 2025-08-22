
# Mixtli Pro API (Final Package)

Incluye:
- Backend completo (Express + Prisma + JWT + Roles)
- Seed con admin (admin@mixtli.local / Admin123*)
- CHECKLIST.md (guía de verificación en Postman)

## Variables de entorno
- PORT=10000
- DATABASE_URL=postgresql://usuario:password@host/dbname?sslmode=require
- JWT_SECRET=<cadena-secreta>

## Build & Start (Render)
- Build: `npm install && npm run render-build && npm run seed`
- Start: `node src/server.js`
