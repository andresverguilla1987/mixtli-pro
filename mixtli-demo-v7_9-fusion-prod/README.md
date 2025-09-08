# Mixtli — DEMO PACK v7_9 FUSION (UI + API)
Un solo ZIP con:
- **UI FUSION** (billing/admin/dashboard/auth) en `/public/preview/*`
- **API Prisma** (`/auth/register`, `/users/stats`, `/users/recent`)
- **Métricas Prometheus** (`user_signups_total`, `active_users_gauge`)
- **Seguridad** (helmet + rate limit + auditoría)
- **Proxies** `/dash/grafana` y `/dash/prom` (mismo dominio)

## Pasos
1) Mezcla `prisma/schema.additions.prisma` en tu `schema.prisma` y ejecuta:
   ```bash
   npx prisma migrate deploy   # prod (o npx prisma migrate dev)
   ```
2) Instala deps:
   ```bash
   npm i @prisma/client prom-client helmet express-rate-limit http-proxy-middleware
   ```
3) Cablea el server (si usas `apps/api/server.*`):
   ```bash
   node bin/wire-prod.mjs
   ```
4) Variables:
   - `DATABASE_URL`
   - `GRAFANA_URL`, `PROM_URL` (para proxies)

## Rutas clave
- UI: `GET /preview/` (abre `billing.html`, `dashboard.html`, `admin.html`, `auth.html`)
- API: `POST /auth/register`, `GET /users/stats`, `GET /users/recent`
- Métricas: expón tu `/metrics` desde prom-client (si ya lo tienes montado)
- Dashboards: `GET /dash/grafana`, `GET /dash/prom`

## Tips de demo
- Usa ⌘/Ctrl+K para navegar (command palette).
- Pricing: alterna **Mensual/Anual (-15%)** y método (Stripe/MP/PayPal/Crypto).
- Admin/Dashboard: filtros, sort, skeletons y toasts.
