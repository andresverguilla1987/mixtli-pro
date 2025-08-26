PASOS RÁPIDOS (Render):
1) Sube todo el contenido de este ZIP a tu repo (reemplaza archivos).
2) En Render -> Build Command: npm ci && npm run build:render
   Start Command: node server.js
3) Variables de entorno mínimas:
   - DATABASE_URL=postgresql://...
   - PORT=10000
   - S3_REGION=us-east-1 (o tu región)
   - S3_BUCKET=mixtli-pro-bucket
   - S3_ACCESS_KEY_ID=XXXXXXXX
   - S3_SECRET_ACCESS_KEY=YYYYYYYY
   - UPLOAD_MAX_MB=5
4) Opcional para crear un usuario demo al arrancar:
   - SEED_ON_START=1
5) Endpoints:
   - GET  /salud
   - GET  /debug/env-s3
   - GET  /api/users
   - POST /api/users { name, email, password }
   - PATCH /api/users/:id
   - DELETE /api/users/:id
   - POST /api/upload (form-data: file=<archivo>)
