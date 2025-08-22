
# Mixtli Pro (auto-seed)

Repositorio listo para Render con **seed automático** después de instalar.

## Scripts
- `start`: inicia el server
- `postinstall`: genera Prisma y ejecuta `prisma/seed.js`

## Variables de entorno
- `PORT`: Render/Heroku la define automáticamente.
- `DATABASE_URL`: cadena de conexión a PostgreSQL en formato:
  `postgresql://usuario:password@host:5432/nombre_db?schema=public`

## Despliegue en Render
1. Conecta el repo.
2. Build: **npm install**
3. Start: **node src/server.js**
4. Variables: `DATABASE_URL` (y opcionalmente `PORT` si lo usas local).
5. Render ejecuta `npm install` -> dispara `postinstall` -> corre `prisma/seed.js`.

## Endpoints
- `GET /` : status del servicio
