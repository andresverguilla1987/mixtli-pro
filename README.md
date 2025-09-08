
# Mixtli Presigned Uploads (LOCAL | S3 | R2)

Backend Express listo para:
- Presign de **PUT** directo al bucket (S3/R2).
- TTL y auto‑limpieza (cron + lifecycle).
- Antivirus *post‑upload* (opcional, ClamAV/clamd).
- Límites por plan **antes** de emitir el presign.
- “Enviar por email” con link firmado + expiración.
- `request-id` en todos los logs.
- Auth mínima (registro/login JWT) y tabla de uploads.

> **Nota sobre Antivirus “antes del upload”**: con presigned direct‑to‑bucket no es posible inspeccionar el binario **antes** de que suba. La práctica correcta es: validas *metadata* (size/mime/ext) **antes**, emites presign, y **después** del upload escaneas en servidor/worker; sólo cuando pasa el escaneo generas el link de descarga y envíos por email.

## Variables de entorno

Crea `.env` basado en `.env.example`:

```
NODE_ENV=development
PORT=10000

# Auth
JWT_SECRET=supersecret

# Storage
STORAGE_DRIVER=R2  # LOCAL | S3 | R2

# S3 (AWS)
S3_REGION=us-east-1
S3_BUCKET=your-bucket
S3_ACCESS_KEY_ID=AKIA...
S3_SECRET_ACCESS_KEY=...

# R2 (Cloudflare)
R2_ACCOUNT_ID=xxxxxxxxxxxxxxxxxxxx
R2_BUCKET=mixtli-bucket
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
# opcional (si sirves público con dominio propio)
R2_PUBLIC_BASE_URL=https://cdn.tu-dominio.com

# SendGrid
SENDGRID_API_KEY=SG.xxxxx
MAIL_FROM="Mixtli <noreply@tu-dominio.com>"

# DB (usa PostgreSQL en producción)
DATABASE_URL="file:./dev.db?connection_limit=1&pool_timeout=5&socket_timeout=5"

# Antivirus (opcional)
CLAMAV_HOST=127.0.0.1
CLAMAV_PORT=3310

# Límites por plan (bytes)
PLAN_FREE_MAX_SIZE=52428800       # 50 MB
PLAN_PRO_MAX_SIZE=2147483648      # 2 GB
PLAN_ENTERPRISE_MAX_SIZE=10737418240 # 10 GB

# TTL en días
DEFAULT_TTL_DAYS=14
```

## Rutas rápidas

- `POST /auth/register { email, password }`
- `POST /auth/login { email, password }` → `{ token }`
- `POST /upload/presign { filename, size, mime, ttlDays? }` *(auth)*
- `POST /upload/complete { uploadId, etag }` *(auth)*
- `POST /email/send { uploadId, to, message }` *(auth)*
- `GET /upload/:id/link` *(auth)* → URL firmada de descarga (sólo si antivirus=passed o antivirus desactivado)

## Cron de limpieza

1) Configura *lifecycle rules* en el bucket (S3/R2) para expirar objetos a los 7–14 días.
2) Además corre `npm run cleanup` 1 vez al día (Render Cron, etc.). Este job elimina en bucket y en DB los uploads vencidos.

## Prisma

```bash
npm i
npx prisma generate
npm run prisma:push
npm run dev
```

Listo para probar con Postman:
1. `POST /auth/register`
2. `POST /auth/login` → copia el token como `Authorization: Bearer <token>`
3. `POST /upload/presign` → usa `putUrl` devuelto para subir **PUT** desde el cliente.
4. `POST /upload/complete` para marcar el ETag (dispara escaneo si CLAMAV está activo).
5. `POST /email/send` para enviar el link firmado (sólo si antivirus pasó).

