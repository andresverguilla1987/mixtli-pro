# Mixtli Pro API (Express + Prisma + JWT)

## Variables de entorno (Render → Environment)
- `DATABASE_URL` = externa de Postgres con `?sslmode=require` (y si quieres `&schema=public`)
- `PORT` = `10000`
- `JWT_SECRET` = un string largo y aleatorio (obligatorio en producción)

> Activa el candadito "Available during build" en `DATABASE_URL`.

## Comandos (Render)
- **Build Command**
```
npm install && npx prisma generate && npx prisma db push && npx prisma db seed
```
- **Start Command**
```
node src/server.js
```

## Endpoints
- `GET /` — estado
- `GET /salud` — chequeo DB
- `POST /auth/register` — { name, email, password } → { user, token }
- `POST /auth/login` — { email, password } → { user, token }
- `GET /api/users` — (token) lista
- `GET /api/users/:id` — (token)
- `POST /api/users` — (token) crea { name, email, password, role? }
- `PUT /api/users/:id` — (token) actualiza
- `DELETE /api/users/:id` — (token) elimina

## Notas
- El seed crea un admin: `admin@mixtli.local` / `Admin123!`.
- Envía el token como `Authorization: Bearer <token>`.
