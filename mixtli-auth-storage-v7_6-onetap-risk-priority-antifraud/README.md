# Mixtli Auth & Storage — v7_6 (onetap + risk/priority + antifraud)
Incluye:
- `billing.html` (Planes y Recargas) con métodos Stripe/MP/PayPal/Crypto y estimador BTC/ETH/USDC
- `admin.html` (panel con Depósitos, KYC, Reportes, Tenants, Fraude)
- `auth.html` (login/registro simple) + `dashboard.html`
- `assets/config.js` → `mode: 'demo' | 'supabase' | 'prisma'`

Cómo usar:
- Abre `auth.html` para crear sesión demo.
- En `billing.html` usa **Configurar link** o **Simular compra**.
- Cambia `mode` a `supabase` o `prisma` para conectar backend real.
