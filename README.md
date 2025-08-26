# Mixtli API (limpia)

Endpoints:
- `GET /salud` -> health check
- `GET /api/users` -> lista usuarios (id, email, createdAt, updatedAt)
- `POST /api/users` -> crea usuario (acepta `email` o `correoElectronico` + `password`), hashea el password

## .env requerido
- `DATABASE_URL` (Postgres)
- `PORT` (opcional, por defecto 10000)
- `CORS_ORIGENES` (opcional, CSV de orígenes permitidos; Postman funciona sin origin)

## Instalación local
```bash
npm install
npx prisma db push
npm start
```

## Postman
Importa `mixtli-api.postman_collection.json` y usa `BASE_URL` con tu Render URL.
