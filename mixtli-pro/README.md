# Mixtli Pro API – JWT + Roles (ADMIN/USER)

## Env (Render)
- `DATABASE_URL` = externa con `?sslmode=require`
- `PORT` = `10000`
- `JWT_SECRET` = string largo (obligatorio)

## Comandos (Render)
- **Build:** `npm install && npx prisma generate && npx prisma db push && npx prisma db seed`
- **Start:** `node src/server.js`

## Roles
- `USER`: solo lectura en `/api/users` (GET)
- `ADMIN`: CRUD completo en `/api/users`

## Credenciales seed
- Admin: `admin@mixtli.local` / `Admin123!`
- User:  `user@mixtli.local`  / `User123!`
