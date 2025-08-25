# Mixtli – Direct Upload (multer + aws-sdk v2) + Presigned (v3)

Este paquete agrega **/api/upload** (multipart form-data) para subir archivos al bucket S3 **vía servidor**.
Mantiene también los endpoints de presign (`/api/uploads/presign` y `/api/uploads/verify`).

## Variables (Render)
- `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`
- `S3_BUCKET` (ej. mixtli-pro-bucket)
- `S3_REGION` (ej. us-east-1)
- (Opcional) `S3_ENDPOINT` si usas R2/MinIO

## Pasos
1. Reemplaza `server.js` por el de este paquete.
2. Reemplaza/actualiza `package.json` (incluye aws-sdk y multer).
3. Render → Manual Deploy → Clear build cache & Deploy.
4. Postman: importa `cartero/*.postman_collection.json`.

## Prueba (Upload Direct)
- `Register` → `Login` (guarda token automáticamente).
- `Upload Direct`: POST {{BASE_URL}}/api/upload con form-data `file` (elige archivo).

Respuesta esperada:
```
{ "ok": true, "key": "uploads/2025/08/...", "location": "https://...s3.amazonaws.com/..." }
```

## Notas
- Direct upload consume ancho de banda del servidor; para alto volumen, preferir presigned.
- Tamaño límite actual: 50MB (ajustable en `multer`).
