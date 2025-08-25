# Mixtli S3 API (mínima, pro y limpia)

Endpoints:
- `GET /salud` → ping
- `POST /api/upload` → form-data con clave **file** (tipo File). Sube a S3.

## Variables de entorno requeridas (Render)
- `S3_REGION` = `us-east-1` (tu región)
- `S3_BUCKET` = `mixtli-pro-bucket` (tu bucket)
- `S3_ACCESS_KEY_ID` = (del CSV de IAM)
- `S3_SECRET_ACCESS_KEY` = (del CSV de IAM)

Opcionales:
- `PORT` (Render la inyecta automáticamente)

## Instrucciones (Render)
1. Sube estos archivos al repo (reemplaza *server.js* y agrega la carpeta `src/`).
2. Verifica las variables en **Environment**.
3. Deploy. Probar con:
   - `GET https://<tu-app>.onrender.com/salud`
   - `POST https://<tu-app>.onrender.com/api/upload` (Body > form-data > file)
