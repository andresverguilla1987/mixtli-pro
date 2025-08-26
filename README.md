# Mixtli API (autosend)

API mínima lista para **mandar y que funcione** con Postman.

## Variables de entorno
- `DATABASE_URL` (obligatoria, PostgreSQL de Render)
- `CORS_ORIGENES` (opcional, CSV de orígenes; si no existe, CORS abierto)
- `PORT` (opcional, por defecto `10000`)

## Build / Deploy (Render)
**Build Command**
```
npm install --no-audit --no-fund && npx prisma generate && npx prisma db push
```

**Start Command**
```
node server.js
```

## Endpoints
- `GET /salud` → `{ ok: true, ... }`
- `GET /api/users` → lista usuarios
- `POST /api/users` → crea usuario
  ```json
  { "email": "demo_{{timestamp}}@example.com", "password": "123456" }
  ```
  También acepta `"correo"` o `"correoElectronico"` para el email y `"clave"` para password.
- `PUT /api/users/:id` → actualiza `email` y/o `password`
- `DELETE /api/users/:id` → elimina usuario

## Postman
Importa la colección `mixtli-api.postman_collection.json` y el ambiente `mixtli-api.postman_environment.json`.
La petición **Create user** trae un pre-request que genera un email único automáticamente.
