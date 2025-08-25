# Mixtli S3 Patch (API mínima)

Endpoints:
- `GET /salud` → ping
- `POST /api/upload` → form-data con **file** (imagen o archivo) → sube a S3

Variables de entorno necesarias en Render:
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `S3_BUCKET`  (ej: mixtli-pro-bucket)
- `S3_REGION`  (ej: us-east-1)

## Probar en Postman
- Body → form-data → key: **file** (Type: File) → selecciona una imagen
- URL: `https://<tu-app>.onrender.com/api/upload`
