# Mixtli OpenAPI + Seed de Admin

Este paquete incluye:
- `openapi.yaml` (OpenAPI 3.0 de auth/system).
- `prisma/seed.ts` para crear/actualizar un usuario **ADMIN** (PostgreSQL/Prisma).
- Alternativas: `scripts/seed-admin.mjs` (Mongo/Mongoose) y `sql/seed_admin_postgres.sql` (SQL puro).
- `examples/schema.example.prisma` como referencia (no sobreescribe tu schema).

## Rápido inicio (Prisma + Postgres)

1) Variables de entorno (`.env`):
```
DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/DB
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=S3gura#123
ADMIN_NAME=Admin
```

2) Instala dependencias:
```bash
npm i
```

3) (Si modificaste el schema) aplica migraciones:
```bash
npx prisma migrate deploy   # (o 'migrate dev' en local)
```

4) Corre el seed:
```bash
npm run seed
```

## Alternativa Mongo/Mongoose
Variables:
```
MONGO_URL=mongodb+srv://...
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=S3gura#123
ADMIN_NAME=Admin
```
Ejecuta:
```bash
node scripts/seed-admin.mjs
```

## SQL puro (PostgreSQL)
Ejecuta el archivo `sql/seed_admin_postgres.sql` en tu DB.
> Requiere extensión `pgcrypto` y ajustar nombres de tabla/campos si difieren.

## OpenAPI
El `openapi.yaml` está listo para importar en Swagger UI / Postman / Insomnia.
Si tus rutas reales no llevan `/api` (p. ej. `/auth/*`), haz un buscar/reemplazar.

## Nota
- `examples/schema.example.prisma` es solo referencia; no reemplaza tu `prisma/schema.prisma` existente.
- Si tu tabla/enum de roles difiere, ajusta `role: "ADMIN"` en los seeds.
