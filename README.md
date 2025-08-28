# Mixtli API (base limpia)
API en Express + Prisma para usuarios, con manejo de errores P2002 (email duplicado) y P2025 (registro inexistente).

## Requisitos
- Node 18+
- PostgreSQL
- Variables en `.env` basadas en `.env.example`

## Pasos locales
```bash
npm install
cp .env.example .env   # edita DATABASE_URL y CORS_ORIGINS
npx prisma db push     # crear/actualizar tablas
npm start
```

Endpoints:
- `GET /salud`
- `GET /api/users`
- `POST /api/users` (body: `{ "email": "x@x.com", "password": "1234" }` o `passwordHash`)
- `PUT /api/users/:id` (body opcional: `email`, `password` o `passwordHash`)
- `DELETE /api/users/:id`
