
# Mixtli Pro API (Express + Prisma + JWT + Roles)

API base lista para Render:
- Autenticación con JWT
- Roles (ADMIN, USER)
- Prisma (PostgreSQL)
- Endpoints de ejemplo y CRUD de usuarios

## Variables de entorno
Crea un archivo `.env` (o usa Environment Variables en Render):

```
DATABASE_URL="postgresql://<usuario>:<password>@<host>/<db>?sslmode=require"
JWT_SECRET="pon_un_secreto_largo_aqui"
PORT=10000
```

> En Render no necesitas `.env`; agrega estas keys en **Settings → Environment**.

## Comandos
- `npm install`
- `npm run render-build` (genera Prisma y sincroniza el esquema)
- `npm run seed` (crea un usuario ADMIN si no existe)
- `npm start`

## Endpoints
- `GET /` → bienvenida y rutas
- `GET /salud` → ok
- `POST /api/auth/registro` → crear usuario (role opcional)
- `POST /api/auth/login` → login (devuelve token)
- `GET /api/users` → lista de usuarios (ADMIN)
- `POST /api/users` → crea usuario (ADMIN)
- `GET /api/users/me` → perfil autenticado

## Notas Render
- **Build Command**: `npm install && npm run render-build && npm run seed`
- **Start Command**: `node src/server.js`
- **Region**: usa la misma región que tu Postgres.
