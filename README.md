# Mixtli — Opción 3 Patch v2 (simplificado)

Este `server.js` evita dependencias adicionales usando `getSignedUrl` + `PutObjectCommand`.
Solo requiere:
- `@aws-sdk/client-s3`
- `@aws-sdk/s3-request-presigner`

## Pasos
1) Reemplaza tu `server.js` con este archivo.
2) Asegúrate que en `package.json` estén estas dependencias (o instálalas):
   ```bash
   npm i @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
   ```
3) En Render → Environment:
```
S3_ENDPOINT=https://<ACCOUNT_ID>.r2.cloudflarestorage.com
S3_BUCKET=mixtli
S3_REGION=auto
S3_FORCE_PATH_STYLE=true
S3_ACCESS_KEY_ID=<key>
S3_SECRET_ACCESS_KEY=<secret>
ALLOWED_ORIGINS=["https://tu-netlify"]
```
4) Start Command: `node server.js`
5) Manual Deploy → Clear build cache & deploy.

Prueba con tu colección Postman: Salud → Presign (PUT) → Upload → List.
