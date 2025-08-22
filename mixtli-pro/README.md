# Mixtli Pro API (Express + Prisma + PostgreSQL) — CRUD completo

## Variables en Render
- `DATABASE_URL` = externa de Postgres con `?sslmode=require` (y si quieres `&schema=public`)
- `PORT` = `10000` (Render la inyecta)

## Comandos Render
- **Build Command**:
```
npm install && npx prisma generate && npx prisma db push && npx prisma db seed
```
- **Start Command**:
```
node src/server.js
```

## Endpoints
- `GET /` — estado
- `GET /salud` — chequeo DB
- `GET /api/users`
- `POST /api/users` — { name, email, password }
- `GET /api/users/:id`
- `PUT /api/users/:id` — { name, email, password }
- `DELETE /api/users/:id`
