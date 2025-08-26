# Mixtli - Patch usuarios

Este parche alinea el `schema.prisma` y las rutas `users.js` para evitar los errores:
- `Unknown field 'nombre'` / `Unknown field 'name'`
- `Argument passwordHash is missing`

## Qué incluye
- `prisma/schema.prisma` con el modelo `Usuario` (id, nombre, email, passwordHash, createdAt, updatedAt)
- `src/rutas/users.js` con CRUD listo (usa `nombre`, `email`, `password` en el body para POST/PUT)
- `server.js` con CORS leyendo `CORS_ORIGIN`
- `package.json` con scripts y dependencias

## Cómo aplicar
1) Sube/mezcla estos archivos en tu repo (o arrastra el zip en GitHub).
2) Render build: `npm install && npx prisma generate && npx prisma db push`
3) Prueba:
   - `GET    /salud`
   - `GET    /api/users`
   - `POST   /api/users` body JSON: `{ "nombre":"Demo", "email":"demo@example.com", "password":"123456" }`
   - `GET    /api/users/:id`
   - `PUT    /api/users/:id` body opcional: `{ "nombre":"Nuevo", "email":"nuevo@mail.com", "password":"secreta" }`
   - `DELETE /api/users/:id`

