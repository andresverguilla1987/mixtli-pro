# Mixtli Full API (Auth + CRUD + S3 Uploads)

## Requisitos en Render
Variables **Environment** (ya las tienes):
- `DATABASE_URL`
- `JWT_SECRET`
- `S3_REGION`
- `S3_BUCKET`
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- (Opcional) `S3_ENDPOINT`

## Scripts
- `start`: `node server.js`
- `postinstall`: `prisma generate`

## Despliegue
1. Sube este proyecto a GitHub.
2. En Render, conecta el repo. Build automático.
3. Manual Deploy → Clear build cache & Deploy.

## Endpoints
- GET `/salud`
- GET `/__debug`
- POST `/auth/register` { nombre, email, password }
- POST `/auth/login` { email, password }
- GET `/me` (Bearer)
- CRUD Usuarios: GET/POST/PUT/DELETE `/api/users`
- S3 Presign: POST `/api/uploads/presign`
- S3 Verify: GET `/api/uploads/verify?key=...`
- S3 Direct: POST `/api/upload` (form-data `file`)

## Postman
Importa los archivos en `cartero/`

