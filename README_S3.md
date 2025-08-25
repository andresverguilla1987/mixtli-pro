# Mixtli S3 API (mínima)

## Endpoints
- `GET /salud` – ping
- `POST /api/upload` – Subir archivo al bucket S3 (campo form-data: **file**)

## Variables de entorno requeridas (Render -> Environment)
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `S3_BUCKET`  (p.ej. `mixtli-pro-bucket`)
- `S3_REGION`  (p.ej. `us-east-1`)

## Ejecución local
```bash
npm install
npm start
# http://localhost:10000/salud
```

## Postman
- POST `https://<tu-app>.onrender.com/api/upload`
- Body -> form-data -> key: **file** (tipo File) -> selecciona una imagen
- Respuesta:
```json
{ "ok": true, "key": "1692912345678-foto.png", "location": "https://<bucket>.s3.<region>.amazonaws.com/1692912345678-foto.png" }
```
