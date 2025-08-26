# Mixtli API – Fix Prisma & Users

## Qué corrige
- Prisma 5.22 con modelo `Usuario` (name, email unique, passwordHash, createdAt, updatedAt).
- Rutas de usuarios piden `password` y generan `passwordHash` con `bcryptjs`.
- Subidas a S3 sin ACL.
- Agrega deps que faltaban: `dotenv`, `bcryptjs`, `@aws-sdk/s3-request-presigner`.

## Pasos
1. Sube estos archivos a GitHub (reemplaza los existentes).
2. En Render: **Clear build cache & deploy**.
3. Shell en Render:
   ```bash
   npx prisma generate
   npx prisma db push --force-reset
   ```
4. Prueba en Postman:
   - POST `.../api/users`
     ```json
     { "name": "Usuario Demo", "email": "demo_{{timestamp}}@mixtli.app", "password": "Secreta123" }
     ```
   - GET `.../api/users`
