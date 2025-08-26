# Mixtli API - Fix Users + Prisma

## Instalación local
npm install
npx prisma db push
npm start

## Variables necesarias
DATABASE_URL
PORT
JWT_SECRET
CORS_ORIGIN

## Endpoints
GET /salud
GET /api/users
POST /api/users  body: { "nombre": "...", "email": "...", "password": "opcional" }
PUT /api/users/:id
DELETE /api/users/:id
