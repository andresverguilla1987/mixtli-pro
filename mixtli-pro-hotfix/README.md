# Mixtli Pro HOTFIX

Este hotfix corrige:

1. **Prisma**: elimina `nombre/correo` del `select` (causaba `Unknown field nombre`).
2. **Raíz** `/` con respuesta (adiós 404 en root).
3. **Uploads**: expone `/api/uploads/multipart/*` pero responde **501** si S3 no está configurado (en lugar de 404).

## Variables
- `DATABASE_URL`, `PORT=10000`, `NODE_ENV=production`, `JWT_SECRET`
- (Opcional) `S3_*` para no ver 501 en uploads

## Comandos
```
npm install
npx prisma generate
npx prisma db push
npm start
```

## Endpoints
- `GET /` → info
- `GET /salud`
- `GET /api/users`
- `POST /api/users` → body: `{ "email":"...", "password":"..." }`
- `GET /api/users/:id` / `PUT /api/users/:id` / `DELETE /api/users/:id`
- `POST /api/uploads/multipart/init` → 501 si sin S3
- `GET  /api/uploads/multipart/sign-part` → 501 si sin S3
- `POST /api/uploads/multipart/complete` → 501 si sin S3
- `POST /api/uploads/multipart/abort` → 501 si sin S3
