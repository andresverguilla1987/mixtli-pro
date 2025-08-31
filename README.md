# HOTFIX: routes de usuarios con `:id` numérico y validaciones claras

## Cómo aplicar
1. Copia `src/rutas/users.js` de este zip y reemplaza el de tu proyecto.
2. Reinicia el servidor.

## Qué corrige
- Evita `/api/users/undefined` (solo acepta `:id` numérico).
- Mensajes 400 claros si falta `id` o está mal.
- Selects de Prisma válidos (usa `email` real y lo expone como `correo`).

## Pruebas rápidas
1) POST /api/users  (JSON) → 201 → toma `id`  
2) GET /api/users/:id  → 200  
3) PUT /api/users/:id  (JSON con email/password) → 200  
4) DELETE /api/users/:id → 204
