# Mixtli API (chida)

API Express + Prisma con modelo **Usuario**:
- `id` (Int, autoincrement)
- `nombre` (String)
- `correo` (String, único)
- `passwordHash` (String)
- `createdAt` / `updatedAt`

## Rutas
- `GET /salud`
- `GET /api/users`
- `GET /api/users/:id`
- `POST /api/users`  (body: `{ "nombre", "correo", "contrasena" }`)
- `PUT /api/users/:id` (body parcial: `nombre?`, `correo?`, `contrasena?`)
- `DELETE /api/users/:id`

## Despliegue en Render
1. Configura `DATABASE_URL` (Postgres) en variables de entorno.
2. Build command ya genera Prisma Client.
3. Si usas migraciones, añade `npx prisma migrate deploy` al build.