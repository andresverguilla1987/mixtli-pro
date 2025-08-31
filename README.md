# Mixtli Backend

## Pasos rápidos

1. Configura `.env` a partir de `.env.ejemplo` con tu `DATABASE_URL` de Render y `CORS_ORIGIN`.
2. Instala dependencias: `npm install`
3. Genera cliente Prisma: `npx prisma generate`
4. Sincroniza DB: `npx prisma db push`
5. Inserta datos de prueba: `npm run seed`
6. Arranca el servidor: `npm start`

### Endpoints principales

- GET `/salud`
- GET `/api/users`
- GET `/api/users/:id`
- POST `/api/users` { name, email, password }
- PUT `/api/users/:id`
- DELETE `/api/users/:id`
