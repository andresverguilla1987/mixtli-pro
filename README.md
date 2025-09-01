# Mixtli — Drop-in Uploads + CRUD (CommonJS)

Esto es un **paquete drop-in** para que no tengas que cablear nada a mano.

## Qué incluye
- `server.js` (CJS) — CRUD de usuarios + rutas de uploads ya integradas + estáticos.
- `src/rutas/uploads.js` (CJS) — Endpoints multipart (init, sign, complete, abort).
- `src/lib/s3.js` (CJS) — Cliente S3 y helper de CORS + partSize.
- `public/uploader.html` — Demo web para subir archivos grandes.
- `.env.sample` — Variables de entorno que debes poner en Render.

## Cómo usar (2 pasos)
1) **Copia todo el contenido** de este ZIP en la **raíz** de tu proyecto (reemplaza `server.js`).
2) Instala deps necesarias y deploy:
```bash
npm i @aws-sdk/client-s3 @aws-sdk/s3-request-presigner cors express
# (Prisma ya lo tienes)
```

## Variables de entorno (Render)
Configura mínimo:
```
AWS_ACCESS_KEY_ID=TU_KEY
AWS_SECRET_ACCESS_KEY=TU_SECRET
AWS_REGION=us-east-1
S3_BUCKET=tu-bucket
# Para R2/MinIO:
# S3_ENDPOINT=https://<endpoint>
# S3_FORCE_PATH_STYLE=true
ALLOWED_ORIGINS=https://mixtli-pro.onrender.com
```

## Probar
- Health: `GET /salud`
- Users CRUD: `POST/GET/PUT/DELETE /api/users` (como ya lo usas)
- Uploader web: `GET /uploader.html` → selecciona archivo → **Subir**

Listo. Si falta algo, dime y te rearmo el ZIP.
