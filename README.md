# Mixtli Pro - Fix Pack v2 (con diagnósticos)
- Mejora `login` para detectar campos `password` / `passwordHash` / `hash`
- Añade `/api/auth/me` (validación de Access Token)
- Añade `/api/auth/__debug_user?email=...` para verificar qué campo de hash está presente

## Rutas
- GET `/api/health`
- POST `/api/auth/register`
- POST `/api/auth/login`
- POST `/api/auth/refresh`
- GET `/api/auth/me` (con `Authorization: Bearer <accessToken>`)
- GET `/api/auth/__debug_user?email=correo` (solo para pruebas; quítala en producción)

## Sugerencia
- Asegura `JWT_SECRET` en el entorno de Render.
- Si `__debug_user` te dice `passwordFieldDetected=null`, revisa tu `schema.prisma` y renombra a `password` o ajusta el código.
