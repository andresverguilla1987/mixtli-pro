Mixtli Backend Patch (v1.11.0)
------------------------------
Incluye:
- /salud (200)
- /diag (diagnóstico de env + acceso a bucket)
- /api/list
- /api/presign (usa createPresignedPost)
- /files/:encodedKey (stream)

Cómo usar en Render:
1) Sube estos archivos a tu repo del backend (reemplaza server.js y agrega utils/s3.js).
2) Variables de entorno en Render → Environment:
   - AWS_ACCESS_KEY_ID
   - AWS_SECRET_ACCESS_KEY
   - AWS_REGION (auto para R2; ej. us-east-1 para AWS S3)
   - S3_BUCKET
   - S3_ENDPOINT (solo R2)
   - S3_FORCE_PATH_STYLE (true para R2, false para AWS S3)
   - ALLOWED_ORIGINS (JSON array o coma-separado)
3) Redeploy.
4) Verifica /diag.
