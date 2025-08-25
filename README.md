# Mixtli – Uploads con URLs pre-firmadas (S3/R2/MinIO)

Este paquete agrega endpoints para subir archivos **directo al storage** sin pasar por el servidor:
- `POST /api/uploads/presign` → genera URL de subida (PUT) válida por 5 min.
- `GET /api/uploads/verify?key=...` → verifica si el objeto existe (HEAD).

## Variables de entorno (Render)
- `S3_REGION` (ej. `us-east-1`)
- `S3_BUCKET` (nombre del bucket)
- `S3_ACCESS_KEY_ID` y `S3_SECRET_ACCESS_KEY`
- `S3_ENDPOINT` (opcional, para R2 o MinIO; si usas AWS puro, déjalo vacío)

## Pasos
1. Reemplaza `server.js` por el de este paquete (o integra las rutas si ya tienes lógica propia).
2. Reemplaza/actualiza `package.json` para incluir `@aws-sdk/*` (ya viene en este zip).
3. En **Render → Environment** define las variables S3 y **Save**.
4. **Manual Deploy → Clear build cache & Deploy**.
5. En **Postman**, importa `cartero/mixtli-uploads-s3.postman_collection.json` y su environment.
6. Flujo de prueba:
   - `Register` → `Login` (guarda token)
   - `Presign upload` → te da `{ url, method, headers, key }`
   - Con esa `url` haces `PUT` del archivo (desde frontend o Postman)
   - `Verify upload` para confirmar que existe.

## Nota
- El presign es por 5 minutos.
- Si usas Cloudflare R2/MinIO, define `S3_ENDPOINT` y activa `forcePathStyle` (ya está en el código).
