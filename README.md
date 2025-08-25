# Mixtli S3 API (drop-in)

API mínima para subir, listar, obtener URL presignada y borrar archivos en S3.

## Endpoints
- GET `/salud` → ping
- POST `/api/upload` → form-data (key `file` tipo *File*)
- GET `/api/files` → lista hasta 50 objetos (prefijo `UPLOAD_PREFIX`)
- GET `/api/file-url?key=...` → URL presignada (5 min)
- DELETE `/api/file?key=...` → elimina el objeto

## Variables (Render → Environment)
- `S3_REGION` = us-east-1
- `S3_BUCKET` = <tu bucket>
- `S3_ACCESS_KEY_ID` = <Access Key ID>
- `S3_SECRET_ACCESS_KEY` = <Secret Access Key>

Opcionales:
- `UPLOAD_MAX_MB` = 5
- `ALLOWED_MIME` = image/jpeg,image/png,image/webp,image/gif,image/svg+xml,application/pdf
- `UPLOAD_PREFIX` = uploads
- `S3_ENDPOINT` = (solo si usas R2/MinIO)

## Deploy
1) Sube estos archivos a tu repo (reemplaza los actuales).
2) Render hará deploy al hacer commit.
3) Prueba:
   - GET `https://<tu-app>.onrender.com/salud`
   - POST `https://<tu-app>.onrender.com/api/upload` (form-data → file)

