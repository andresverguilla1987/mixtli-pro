
# Mixtli API (fix)
API Express con Prisma (PostgreSQL) y subida a S3.

## Endpoints
- `GET /salud`
- `GET /api/users`
- `POST /api/users` body: `{ "name": "Demo", "email": "demo@mixtli.app", "password": "opcional" }`
- `PUT /api/users/:id`
- `DELETE /api/users/:id`
- `POST /api/upload` (form-data, key `file`)

## Setup local
1) `cp .env.example .env` y rellena `DATABASE_URL` y S3
2) `npm install`
3) `npx prisma db push`
4) `npm start`

## Postman ejemplo
`POST /api/users`
```json
{ "name": "Demo User", "email": "demo{{timestamp}}@mixtli.app", "password": "123456" }
```
