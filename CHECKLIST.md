
# ✅ Checklist de Verificación – Mixtli API (JWT + Roles)

## Endpoints principales
- GET /salud → { "ok": true }
- POST /api/auth/login → devuelve token
- GET /api/users/me (con token)
- GET /api/users (solo ADMIN)
- POST /api/users (solo ADMIN)
- PUT /api/users/:id (solo ADMIN)
- DELETE /api/users/:id (solo ADMIN)

## Usuarios de prueba (seed)
- admin@mixtli.local / Admin123*  → ADMIN
- user@mixtli.local / User123*    → USER

## Errores comunes
- 401: Token requerido o inválido
- 403: No autorizado (rol insuficiente)
- 409: Email ya registrado
