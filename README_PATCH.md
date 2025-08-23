# Patch Mixtli – Usuarios (Prisma: `Usuario`)

Este parche alinea el backend para usar el modelo **`Usuario`** en Prisma.

## Qué incluye
- `src/server.js` → monta `/salud` y `/api/users`
- `src/routes/users.js` → usa `prisma.usuario` (no `prisma.user`)
- `prisma/schema.prisma` → modelo `Usuario { id, nombre, email, createdAt }`
- `package.json` → scripts para Render

## Deploy en Render
- **Build Command:** `npm install && npx prisma generate && npx prisma db push`
- **Start Command:** `node src/server.js`

## Probar
- `GET /salud`
- `GET /api/users`
- `POST /api/users` body JSON:
```json
{ "nombre": "Juan", "email": "juan@test.com" }
```
