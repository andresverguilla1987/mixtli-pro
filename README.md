
# Mixtli Mini — Presigned Uploads (S3/R2)

Un solo archivo `server.js`, sin ORM. SQLite embebido con `better-sqlite3`.
Incluye:
- Registro/Login (JWT)
- Presign PUT directo al bucket (S3 o R2)
- Límites por plan antes del presign
- TTL/limpieza (`node cleanup.js`)
- Enviar por email con link firmado
- request-id en headers y logs
- `public/index.html` para probar

## Run
```bash
npm i
cp .env.example .env  # edita credenciales
node server.js
# opcional cron diario
node cleanup.js
```
