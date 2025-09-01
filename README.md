# Mixtli Full
API Express + Prisma + JWT + S3 multipart + páginas públicas

## Deploy rápido (Render)
Build: `npm run build`
Start: `npm start`

Vars: PORT=10000, NODE_ENV=production, CORS_ORIGIN=*, JWT_SECRET, DATABASE_URL, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION, S3_BUCKET

## Rutas
- GET /salud
- POST /api/auth/register {email,password}
- POST /api/auth/login {email,password}
- POST /api/auth/refresh (Bearer token)
- GET /api/users (Bearer)
- GET /api/users/:id (Bearer)
- POST /api/users {email,password}
- PUT /api/users/:id {email} (Bearer)
- DELETE /api/users/:id (Bearer)
- POST /api/uploads/multipart/init {key,contentType} (Bearer)
- GET /api/uploads/multipart/sign-part?key&uploadId&partNumber (Bearer)
- POST /api/uploads/multipart/complete {key,uploadId,parts:[{ETag,PartNumber}]} (Bearer)
- POST /api/uploads/multipart/abort {key,uploadId} (Bearer)
- GET /api/files?prefix= (Bearer)

Páginas:
- /public/uploader.html
- /public/files.html
