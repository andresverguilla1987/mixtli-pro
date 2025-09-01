# Mixtli Clean API (Express + Prisma + S3)

API base limpia lista para Render:
- CRUD de usuarios (Prisma/Postgres)
- Subidas multipart a S3/R2/MinIO (AWS SDK v3) con URLs firmadas
- Páginas de prueba (`/uploader.html` y `/files.html`)
- Colección Postman incluida

## Variables de entorno (Render)
- `DATABASE_URL` (Postgres de Render)
- `PORT` = 10000
- `NODE_ENV` = production
- `CORS_ORIGIN` = *  (o tu dominio)
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_REGION` (ej. us-east-1)
- `S3_BUCKET` (ej. mixtli-pro-bucket)

## Build & Start (Render)
Build command:
```
npm install --no-audit --no-fund && npx prisma generate && npx prisma db push
```
Start command:
```
node server.js
```

## Prisma (local)
```
npm i
npm run prisma:generate
npm run prisma:push
npm run dev
```

## Endpoints
- `GET /salud`
- `GET /api/users`
- `POST /api/users`  body: `{ "email":"x@x.com", "password":"123456" }`
- `GET /api/users/:id`
- `PUT /api/users/:id` body: `{ "email":"nuevo@x.com" }`
- `DELETE /api/users/:id`

Uploads multipart:
- `POST /api/uploads/multipart/init`
- `GET  /api/uploads/multipart/sign-part?key=...&uploadId=...&partNumber=1`
- `POST /api/uploads/multipart/complete`
- `POST /api/uploads/multipart/abort`

## Páginas de prueba
- `/uploader.html`  (sube archivos grandes al bucket)
- `/files.html`     (lista objetos por prefijo)
