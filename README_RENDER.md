# Mixtli Pro – Notificaciones + 2FA listo para Render

Este paquete contiene:
- Variables de entorno (`.env.render.example`)
- Middleware de integración para tu `server.js`
- Guía paso a paso para Render

## Uso rápido
1. Copia `.env.render.example` → agrega tus claves en Render (Dashboard → Environment).
2. Monta el folder `notifications/` en tu repo principal.
3. Importa y usa los routers en tu `server.js` como en el snippet.

Endpoints:
- /security/2fa/setup
- /security/2fa/enable
- /security/2fa/backup/pdf
- /security/2fa/backup/use
- /events/login
- /events/twofa-enabled
- /events/password-reset-completed
