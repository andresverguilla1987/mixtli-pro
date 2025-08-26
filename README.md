# Mixtli API — Fix Pack

Incluye:
- `package.json` con dependencias necesarias (Prisma, S3 presigner, bcrypt)
- `prisma/schema.prisma` con `Usuario` (passwordHash, createdAt, updatedAt)
- `src/rutas/users.js` creando password hash
- `src/rutas/upload.js` para subir archivos a S3 (POST /api/upload, campo `file`)

## Pasos rápidos

1. Sube estos archivos al repo (respeta rutas).
2. En Render: **Clear build cache & deploy**.
3. En Render → Shell:
   ```bash
   npx prisma generate
   npx prisma db push --force-reset
   ```
4. Probar en Postman:
   - GET `https://TU_URL/salud`
   - POST `https://TU_URL/api/users` (JSON: nombre, email, password)
   - GET `https://TU_URL/api/users`
   - POST `https://TU_URL/api/upload` (form-data, key: `file`)

Variables necesarias:
- `DATABASE_URL`
- `S3_REGION`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`
- (opcional) `S3_ENDPOINT`, `UPLOAD_MAX_MB`, `ALLOWED_MIME`, `UPLOAD_PREFIX`
