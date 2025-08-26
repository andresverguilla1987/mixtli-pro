# Mixtli Clean API (Usuarios)

API mínima y limpia con Prisma + Express para la colección `Usuario`.

## Modelo

- `id` (Int, autoincrement)
- `email` (String, único)
- `passwordHash` (String)
- `createdAt` (DateTime, default now)
- `updatedAt` (DateTime, auto @updatedAt)

## Configuración

1. Copia `.env.example` a `.env` y ajusta:
```
DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/DB?schema=public
PORT=10000
CORS_ORIGINS=http://localhost:5173,https://tu-frontend.com
```

2. Instala dependencias y empuja el esquema:
```
npm install
npx prisma db push
```

3. Levanta el server:
```
npm start
```

## Rutas

- `GET /salud` → `{ ok: true }`
- `GET /api/users` → lista usuarios (sin `passwordHash`)
- `POST /api/users` → crea usuario
  ```json
  { "email": "demo@example.com", "password": "Mixtli123!" }
  ```
- `PUT /api/users/:id` → actualiza email y/o password
  ```json
  { "email": "nuevo@example.com", "password": "Nuevo123!" }
  ```
- `DELETE /api/users/:id` → borra usuario

## Notas
- No se expone `passwordHash` en respuestas.
- Errores comunes: P2002 (email duplicado), P2025 (no existe).
