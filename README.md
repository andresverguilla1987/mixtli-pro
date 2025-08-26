# Mixtli API (Express + Prisma + S3)

API mínima y **limpia** lista para Render.

## Endpoints
- `GET /salud` → ping
- `GET /api/users` → lista usuarios (sin exponer `passwordHash`)
- `POST /api/users` → crea usuario `{ nombre, email, password }`
- `POST /api/upload` → sube archivo (multipart, campo **file**)
- `GET /api/upload/presign?key=...&contentType=...` → URL firmada PUT
- `GET /api/debug/env-s3` → verificación de variables S3 (sin imprimir secretos)

## Variables de entorno
Ver `.env.example` y configura en **Render → Environment**.

## Prisma
1. `npm install`
2. `npx prisma generate`
3. `npx prisma db push`  (o `--force-reset` si cambiaste columnas y quieres limpiar)

> En Render, el `postinstall` ya corre `prisma generate` automáticamente.
