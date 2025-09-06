# Mixtli – Notificaciones + 2FA (TOTP) + Códigos de Respaldo (PDF)

Incluye:
- Mailer provider-agnostic (SendGrid o SES)
- Plantillas HTML con Handlebars
- Eventos de notificación: nuevo login, 2FA activado, reset de contraseña completado
- 2FA TOTP con QR + Códigos de Respaldo (hash en DB) + PDF imprimible
- Script de seed para crear admin

## Requisitos
- Node 18+
- SQLite (incluido por Prisma) o tu DB favorita
- `pnpm`/`npm`

## Setup rápido
```bash
cp .env.example .env
pnpm i   # o npm i
pnpm prisma:gen
pnpm prisma:migrate
pnpm run seed
pnpm run dev
```

## Endpoints
- `POST /security/2fa/setup` → genera secreto y QR (no habilita)
- `POST /security/2fa/enable` → body: `{ code }` (6 dígitos), habilita y genera backup codes (se devuelven **una sola vez**)
- `POST /security/2fa/backup/pdf` → body: `{ plainCodes: string[] }` (mismo request posterior a enable), responde PDF
- `POST /security/2fa/backup/use` → body: `{ code }` (consume un código)
- `POST /events/login` → dispara correo de nuevo login
- `POST /events/twofa-enabled` → dispara correo de 2FA activado
- `POST /events/password-reset-completed` → dispara correo de reset completado

> Autenticación de demo: se carga/crea un usuario por header `X-User-Email`. En prod, reemplaza el middleware por tu auth real.

## Variables .env
Ver `.env.example`.

## Plantillas
Editar archivos en `/emails/*.hbs`. Variables comunes: `app_name`, `email`, `year`.
