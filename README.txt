# Mixtli — **V6** Billing + Cuotas (GB) + Recargas
Generado: 2025-09-07 04:09

## Qué incluye
- **Cuotas por usuario** (GB) con barra de uso en el header.
- **Bloqueo de subida** si te pasas de la cuota.
- **Recargas de GB** (prepagos) y **plan mensual** (opcional).
- Página **Billing** con botones a **Stripe Payment Links** o simulador en DEMO.
- **SQL Supabase** para `profiles`, `file_index`, `purchases` + RLS.
- **Edge Function** `stripe-webhook` (Deno) para acreditar GB vía webhooks.

> DEMO guarda todo en localStorage y simula compras. En modo REAL, usa Supabase + Stripe.

---
## Flujo recomendado (REAL)
1) Crea precios en Stripe (Payment Links o Checkout) para tus recargas (10GB, 50GB, 100GB…) y/o plan mensual.
2) Anota los **price IDs** (`price_...`) o usa **Payment Links** públicos.
3) Despliega la función `stripe-webhook` en Supabase y configura variables:
   - `STRIPE_WEBHOOK_SECRET` (endpoint secreto del webhook)
   - `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY`
   - `SKU_MAP_JSON` (mapa de `price_id -> GB`), ej: `{"price_123":10,"price_456":50}`
4) En Stripe → Webhooks: envía `checkout.session.completed` a tu endpoint de la función.
5) En `assets/config.js` configura `billing.stripeLinks` o `billing.priceIds`.
6) El usuario compra → Stripe manda webhook → función acredita GB en `profiles` → UI refleja la nueva cuota.

---
## SQL (ejecuta en Supabase)
```sql
-- Perfiles con cuota y uso
create table if not exists public.profiles (
  user_id uuid primary key,
  email text,
  plan text default 'free',
  quota_gb numeric default 2,      -- base: 2 GB
  bonus_gb numeric default 0,      -- recargas suman aquí
  used_bytes bigint default 0,
  updated_at timestamptz default now(),
  created_at timestamptz default now()
);
alter table public.profiles enable row level security;
create policy "own_profile" on public.profiles
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Índice de archivos para conocer tamaño
create table if not exists public.file_index (
  user_id uuid not null,
  path text not null,
  size_bytes bigint not null,
  created_at timestamptz default now(),
  primary key (user_id, path)
);
alter table public.file_index enable row level security;
create policy "own_files" on public.file_index
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Compras (auditoría)
create table if not exists public.purchases (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null,
  provider text not null,             -- 'stripe'
  provider_ref text not null,         -- checkout session id / payment intent
  price_id text,                      -- opcional (Stripe price id)
  gb numeric not null,
  amount_cents integer,
  currency text default 'mxn',
  created_at timestamptz default now()
);
alter table public.purchases enable row level security;
create policy "own_purchases" on public.purchases
  for select to authenticated using (user_id = auth.uid());
```

> Inicializa `profiles` para usuarios existentes: en `onAuth` o al entrar al dashboard, si no hay profile crea uno con defaults.

---
## Edge Function `stripe-webhook` (Deno)
Archivo: `supabase/functions/stripe-webhook/index.ts`
```ts
// deno run --allow-env --allow-net --allow-read --allow-sys
import Stripe from "npm:stripe@14.25.0";
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const STRIPE_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SKU_MAP_JSON = Deno.env.get("SKU_MAP_JSON") || "{}"; // { "price_...": 10, ... }
const SKU_MAP: Record<string, number> = JSON.parse(SKU_MAP_JSON);

const stripe = new Stripe(Deno.env.get("STRIPE_API_KEY") || "", { apiVersion: "2024-06-20" });
const db = createClient(SUPABASE_URL, SERVICE_KEY);

serve(async (req) => {
  const sig = req.headers.get("stripe-signature");
  const body = await req.text();
  let evt;
  try {
    evt = stripe.webhooks.constructEvent(body, sig!, STRIPE_SECRET);
  } catch (err) {
    return new Response(`Webhook signature verification failed. ${err}`, { status: 400 });
  }

  if (evt.type === "checkout.session.completed") {
    const session = evt.data.object as any;
    const user_id = session.metadata?.user_id; // Puedes configurar metadata en Checkout
    // Nota: con Payment Links puedes mapear por price_id vía SKU_MAP_JSON
    const price_id = session?.line_items?.data?.[0]?.price?.id || session?.display_items?.[0]?.price?.id || session?.metadata?.price_id;
    const gb = SKU_MAP[price_id] || Number(session.metadata?.gb || 0);
    const amount = session.amount_total ?? session.amount_subtotal ?? 0;
    const currency = session.currency || "mxn";
    const provider_ref = session.id;

    if (!user_id || !gb) {
      console.log("Missing user_id or gb; skipping.");
      return new Response("ok", { status: 200 });
    }

    await db.from("profiles").upsert({ user_id, email: session.customer_details?.email }, { onConflict: "user_id" });
    await db.from("purchases").insert({
      user_id, provider: "stripe", provider_ref, price_id, gb, amount_cents: amount, currency
    });
    const { data: prof } = await db.from("profiles").select("bonus_gb").eq("user_id", user_id).single();
    const bonus = (prof?.bonus_gb || 0) + gb;
    await db.from("profiles").update({ bonus_gb: bonus, updated_at: new Date().toISOString() }).eq("user_id", user_id);
  }

  return new Response("ok", { status: 200 });
});
```

**Despliegue** (CLI de Supabase):
```bash
supabase functions deploy stripe-webhook
supabase functions secrets set STRIPE_WEBHOOK_SECRET=whsec_xxx SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... SKU_MAP_JSON='{"price_123":10,"price_456":50}'
# (opcional) STRIPE_API_KEY si quieres consultar más info
```
En Stripe → Webhooks → agrega endpoint: `https://<project>.functions.supabase.co/stripe-webhook` con evento `checkout.session.completed`.

---
## Configuración Frontend (`assets/config.js`)
```js
window.CONFIG = {
  mode: "demo", // "demo" o "supabase"
  supabaseUrl: "",
  supabaseAnonKey: "",
  storageBucket: "files",
  billing: {
    // Opcional: enlaces públicos (Payment Links). Si usas Checkout dinámico, déjalos en "".
    stripeLinks: {
      topup10: "",  // p.ej. https://buy.stripe.com/...
      topup50: "",
      topup100: "",
      proMonthly: ""
    },
    // Si usas Checkout + webhook: los price IDs sirven para mostrar GB en UI (no se usan desde el cliente).
    priceIds: {
      topup10: "price_123",
      topup50: "price_456",
      topup100: "price_789",
      proMonthly: "price_abc"
    },
    products: {
      topup10: { gb: 10, label: "Recarga 10 GB" },
      topup50: { gb: 50, label: "Recarga 50 GB" },
      topup100: { gb: 100, label: "Recarga 100 GB" },
      proMonthly: { gb: 200, label: "Plan Pro (200 GB/mes)" }
    }
  }
};
```

---
## Notas de UX/Negocio
- Mantén un **free tier** (2–5 GB) para enganchar y vende **recargas** de 10/50/100 GB.
- Recargas suman a `bonus_gb` y **no expiran** (o puedes poner expiración en `purchases` y un job que reste).
- Si ofreces plan mensual, resetea `bonus_gb` cada mes o usa `quota_gb` por plan + `bonus_gb` aparte.
- Muestra un **banner** al 80% de uso y bloquea subida al 100%.


---
# V6.1 — LATAM Payments (Stripe + Mercado Pago + PayPal)
Generado: 2025-09-07 04:14

## Qué cambia
- Selector de **país** y **método de pago** (Stripe / Mercado Pago / PayPal) en `billing.html`.
- Links por país y por producto (10/50/100 GB, plan Pro), configurables en `assets/config.js`.
- **Moneda local** por país (MXN, ARS, BRL, CLP, COP, PEN, USD).
- **Webhooks** extra de ejemplo:
  - `supabase/functions/mercadopago-webhook/index.ts`
  - `supabase/functions/paypal-webhook/index.ts`
- Todos acreditan GB en `profiles.bonus_gb` y guardan en `purchases` (provider, ref, currency, amount).

## Configuración rápida
1) En `assets/config.js` define tus **links por país**:
   - `billing.links.stripe.MX.topup10 = "https://buy.stripe.com/..."`
   - `billing.links.mercadopago.AR.topup10 = "https://mpago.la/..."`
   - `billing.links.paypal.CO.topup10 = "https://www.paypal.com/..."`
2) Despliega funciones y añade secretos:
   ```bash
   supabase functions deploy mercadopago-webhook
   supabase functions secrets set SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... MP_WEBHOOK_SECRET=xxx SKU_MAP_JSON='{"10GB":10,"50GB":50,"100GB":100}'
   supabase functions deploy paypal-webhook
   supabase functions secrets set SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... PAYPAL_WEBHOOK_ID=xxx SKU_MAP_JSON='{"10GB":10,"50GB":50,"100GB":100}'
   ```
3) En Mercado Pago / PayPal configura webhook al endpoint de la función.
4) (Opcional) Usa **SKU** o **metadata** para enviar `user_id` y `sku` en la preferencia/orden. Los ejemplos aceptan lookup por `sku` y/o `price_id` via `SKU_MAP_JSON`.

## Países soportados en UI (editable):
- México (MX, MXN), Argentina (AR, ARS), Brasil (BR, BRL), Chile (CL, CLP), Colombia (CO, COP), Perú (PE, PEN), Internacional (INT, USD).


---
# V6.2 — Wallet (Saldo), Recibos PDF y Depósitos Bancarios
Generado: 2025-09-07 04:20

## Novedades
- **Wallet (saldo por usuario)** con **historial** (ledger).
- **Depósitos** (wallet top-up) vía Stripe/MercadoPago/PayPal **o transferencia bancaria** con referencia.
- **Pagar con saldo** para comprar GB desde la UI.
- **Página de éxito** (`success.html`) con recibo descargable **PDF**.
- Webhooks de Stripe/MP/PayPal aceptan `metadata.intent = 'wallet_topup' | 'gb_purchase'`.
- **SQL** ampliado: `wallets`, `wallet_ledger`, `bank_deposits` + RLS.
- Ejemplo de **RPC** para debitar saldo y acreditar GB en una sola transacción.

## SQL adicional (ejecuta en Supabase)
```sql
-- Wallet por usuario
create table if not exists public.wallets (
  user_id uuid primary key,
  balance_cents bigint default 0,
  currency text default 'mxn',
  updated_at timestamptz default now(),
  created_at timestamptz default now()
);
alter table public.wallets enable row level security;
create policy "own_wallet" on public.wallets
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Ledger: entradas de saldo
create table if not exists public.wallet_ledger (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null,
  type text not null, -- 'deposit','debit','refund','adjust'
  amount_cents bigint not null, -- positivo para deposit/refund/adjust+, negativo para debit
  currency text default 'mxn',
  provider text,      -- stripe/mercadopago/paypal/bank/manual
  provider_ref text,  -- id transacción
  description text,
  created_at timestamptz default now()
);
alter table public.wallet_ledger enable row level security;
create policy "own_wallet_ledger" on public.wallet_ledger
  for select to authenticated using (user_id = auth.uid());

-- Depósitos bancarios manuales (para transferencias)
create table if not exists public.bank_deposits (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null,
  reference text not null,     -- referencia única a mostrar al cliente
  expected_cents bigint not null,
  currency text default 'mxn',
  status text default 'pending', -- pending, approved, rejected
  proof_url text,              -- opcional: recibo/imagen
  created_at timestamptz default now(),
  approved_at timestamptz
);
alter table public.bank_deposits enable row level security;
create policy "own_bank_deposits" on public.bank_deposits
  for select to authenticated using (user_id = auth.uid());

-- RPC: compra con saldo (atómica)
create or replace function public.buy_gb_with_wallet(p_user uuid, p_gb numeric)
returns void language plpgsql security definer as $$
declare
  v_price_cents integer := ceil(p_gb * 1000); -- ejemplo: 1GB = $10.00 => ajusta a tu pricing
  v_balance bigint;
begin
  -- lock wallet row
  insert into wallets(user_id) values (p_user)
  on conflict (user_id) do nothing;

  update wallets set updated_at = now() where user_id = p_user;
  select balance_cents into v_balance from wallets where user_id = p_user for update;
  if v_balance is null then
    v_balance := 0;
  end if;

  if v_balance < v_price_cents then
    raise exception 'Saldo insuficiente';
  end if;

  -- Debita wallet
  update wallets set balance_cents = balance_cents - v_price_cents, updated_at = now() where user_id = p_user;
  insert into wallet_ledger(user_id, type, amount_cents, provider, description)
    values (p_user, 'debit', -v_price_cents, 'wallet', concat('Compra de ', p_gb, ' GB'));

  -- Acredita GB
  insert into purchases(user_id, provider, provider_ref, price_id, gb, amount_cents, currency)
    values (p_user, 'wallet', gen_random_uuid()::text, 'wallet', p_gb, v_price_cents, 'mxn');

  -- Sumar a bonus_gb
  update profiles set bonus_gb = coalesce(bonus_gb,0) + p_gb, updated_at = now() where user_id = p_user;
end;
$$;

revoke all on function public.buy_gb_with_wallet(uuid, numeric) from public;
grant execute on function public.buy_gb_with_wallet(uuid, numeric) to authenticated;
```

> Ajusta `v_price_cents` a tu precio por GB. O crea una tabla `sku_prices` y haz lookup.

## Cambios en webhooks
- Si `metadata.intent == 'wallet_topup'`: **no** acredita GB directo; en su lugar:
  - upsert en `wallets`, suma `balance_cents`, añade entrada en `wallet_ledger` (`deposit`), y registra `purchases` con `provider` y `amount`.
- Si `metadata.intent == 'gb_purchase'`: como antes, mapea `sku → GB` y acredita GB.

## UI
- **Billing** ahora muestra **Saldo** (wallet) y botón **Depositar** (Stripe/MP/PayPal/Transferencia).
- Botón **Pagar con saldo** en cada recarga para consumir wallet y convertir a GB.
- **success.html**: muestra detalle (proveedor, monto, referencia) y permite **Descargar PDF**.

## Flujo de Transferencia (bancaria)
1) Usuario crea solicitud de depósito → se genera `reference` única + monto esperado.
2) Usuario transfiere con esa referencia (o sube comprobante).
3) Admin valida y cambia `status = approved` → un job/función suma `balance_cents` y registra en `wallet_ledger`.
4) Usuario ve saldo acreditado y puede **Pagar con saldo**.


---
# V6.3 — Cripto (Coinbase Commerce, NOWPayments, BTCPay)
Generado: 2025-09-07 04:24

## Qué agrega
- **Método "Crypto"** en Billing con sub-proveedor: **Coinbase Commerce**, **NOWPayments**, **BTCPay Server**.
- Config por producto en `assets/config.js` → `billing.links.crypto.*` (puedes usar páginas hospedadas/checkout).
- Webhooks de ejemplo:
  - `supabase/functions/coinbase-webhook/index.ts`
  - `supabase/functions/nowpayments-webhook/index.ts`
  - `supabase/functions/btcpay-webhook/index.ts`
- Soporta `metadata.intent = 'wallet_topup' | 'gb_purchase'` + `user_id` y `sku` (o `gb`).

## Notas rápidas
- Recomendado usar **stablecoins** (USDC/USDT) para minimizar volatilidad.
- Si usas **BTCPay self-hosted**, setea `storeId` y habilita webhook de `InvoiceSettled`.
- Para **Coinbase Commerce**, valida firma `X-CC-Webhook-Signature` con tu `COINBASE_WEBHOOK_SECRET`.
- Para **NOWPayments**, usa IPN y valida `x-nowpayments-sig` con `NOWPAYMENTS_IPN_SECRET`.


---
# V6.4 — Crypto FX (auto‑pricing), Depósito cripto por usuario, Recibo por email, KYC básico
Generado: 2025-09-07 04:28

## Novedades
- **Auto‑pricing en cripto** (BTC/ETH/USDC) con función `rates-proxy` (Edge) que consulta precios y devuelve montos estimados por producto.
- **Depósito cripto por usuario**: función `create-crypto-charge` crea un cobro con metadata (`user_id`, `intent`) para Coinbase Commerce / NOWPayments (elige proveedor). Para BTCPay puedes usar `btcpay-webhook` y un app de checkout con metadata.
- **Recibo por email**: función `send-receipt` (Resend/SendGrid) para enviar correo de confirmación (opcional adjuntar PDF).
- **KYC/AML básico**: campos en `profiles` (`kyc_level`, `kyc_status`) + tabla `kyc_verifications`; límites de depósito/mes por nivel y aviso en UI.

## SQL extra (KYC)
```sql
alter table public.profiles add column if not exists kyc_level text default 'none';  -- none, basic, full
alter table public.profiles add column if not exists kyc_status text default 'unverified'; -- unverified, pending, verified, rejected;

create table if not exists public.kyc_verifications (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null,
  level text not null,        -- basic/full
  status text default 'pending',
  submitted_at timestamptz default now(),
  reviewed_at timestamptz,
  notes text
);
alter table public.kyc_verifications enable row level security;
create policy "own_kyc" on public.kyc_verifications
  for select to authenticated using (user_id = auth.uid());
```

## Edge Functions nuevas
- `rates-proxy`: consulta CoinGecko (o tu proveedor) y devuelve tasas para BTC, ETH, USDC en USD y opcionalmente MXN/ARS/BRL/CLP/COP/PEN.
- `create-crypto-charge`: crea un checkout (Coinbase Commerce o NOWPayments) con metadata `user_id`, `intent='wallet_topup'|'gb_purchase'`, `sku` y `amount` (en fiat).
- `send-receipt`: envía email de recibo (Resend/SendGrid).

### Despliegue
```bash
supabase functions deploy rates-proxy
supabase functions deploy create-crypto-charge
supabase functions deploy send-receipt
# secretos
supabase functions secrets set SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=...
supabase functions secrets set COINGECKO_API_URL=https://api.coingecko.com/api/v3/simple/price
supabase functions secrets set COINBASE_API_KEY=xxx COINBASE_API_BASE=https://api.commerce.coinbase.com
supabase functions secrets set NOWPAYMENTS_API_KEY=xxx NOWPAYMENTS_API_BASE=https://api.nowpayments.io/v1
supabase functions secrets set RESEND_API_KEY=re_xxx  # o SENDGRID_API_KEY
```


---
# V6.5 — Depósito cripto con modal, recibo PDF adjunto por email, y SQL admin para aprobar depósitos
Generado: 2025-09-07 04:32

## Novedades
- **Modal de Depósito** (fiat/cripto): el usuario elige monto, país, método y **proveedor cripto** (Coinbase/NOWPayments/BTCPay). Para cripto, se crea el checkout con `create-crypto-charge` y se redirige al hosted page con metadata (`user_id`, `intent`, `sku`).
- **Recibo por email con PDF adjunto**: la función `send-receipt` ahora acepta `pdf_base64` y `filename`.
- **SQL Admin** (aprobación de transferencias / depósitos bancarios) y **RPC** con `SECURITY DEFINER`:
  - `admin_approve_bank_deposit(p_ref uuid, p_amount_cents int)` → mueve `bank_deposits.status` a `approved`, acredita wallet y agrega ledger.
  - `is_admin()` basada en correos de `admin_emails` (tabla sencilla).

## SQL Admin (ejecuta en Supabase)
```sql
create table if not exists public.admin_emails(email text primary key);
insert into public.admin_emails(email) values ('admin@tu-dominio.com') on conflict do nothing;

create or replace function public.is_admin() returns boolean language sql stable as $$
  select exists(select 1 from admin_emails where email = auth.jwt()->>'email');
$$;

-- Permite a admins ver depósitos de todos
alter table public.bank_deposits enable row level security;
drop policy if exists own_bank_deposits on public.bank_deposits;
create policy "view_own_or_admin" on public.bank_deposits
  for select to authenticated using (user_id = auth.uid() or public.is_admin());

-- Función para aprobar (y acreditar wallet)
create or replace function public.admin_approve_bank_deposit(p_ref uuid, p_amount_cents int)
returns void language plpgsql security definer as $$
declare
  v_user uuid;
  v_curr text;
begin
  if not public.is_admin() then
    raise exception 'not admin';
  end if;
  select user_id, currency into v_user, v_curr from bank_deposits where id = p_ref and status='pending' for update;
  if v_user is null then
    raise exception 'deposit not found or already processed';
  end if;

  update bank_deposits set status='approved', approved_at=now() where id = p_ref;

  insert into wallets(user_id) values (v_user) on conflict (user_id) do nothing;
  update wallets set balance_cents = coalesce(balance_cents,0) + p_amount_cents, updated_at = now() where user_id = v_user;
  insert into wallet_ledger(user_id, type, amount_cents, currency, provider, provider_ref, description)
    values (v_user, 'deposit', p_amount_cents, coalesce(v_curr,'mxn'), 'bank', p_ref::text, 'Depósito bancario aprobado');
end;
$$;
revoke all on function public.admin_approve_bank_deposit(uuid, int) from public;
grant execute on function public.admin_approve_bank_deposit(uuid, int) to authenticated;
```
**Nota:** Cambia `admin@tu-dominio.com` por tus correos admin. Puedes crear una UI interna que llame `rpc('admin_approve_bank_deposit', ...)`.


---
# V6.6 — Panel Admin (aprobaciones, KYC, reportes)
Generado: 2025-09-07 04:37

## Qué incluye
- `admin.html` + `assets/admin.js`: panel seguro para **admins** (según `public.is_admin()`).
- Tabs: **Depósitos** (aprobar transferencias), **KYC** (cambiar `profiles.kyc_status`), **Reportes** (exportar CSV de `purchases` y `wallet_ledger`).

## SQL RLS extra (dar visibilidad a admins)
```sql
-- Purchases (ver todos si eres admin)
create policy if not exists admin_purchases on public.purchases
  for select to authenticated using (public.is_admin());

-- Wallet ledger (ver todos si eres admin)
create policy if not exists admin_wallet_ledger on public.wallet_ledger
  for select to authenticated using (public.is_admin());

-- Profiles (ver y actualizar KYC si eres admin)
create policy if not exists admin_profiles_select on public.profiles
  for select to authenticated using (public.is_admin());
create policy if not exists admin_profiles_update on public.profiles
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
```

> Asegúrate de haber creado `admin_emails` e insertado tus correos admin (ver V6.5).

## Uso
1) Pon `mode: "supabase"` y tus claves en `assets/config.js`.
2) Abre `admin.html`, inicia sesión con un correo en `admin_emails`.
3) **Depósitos** → aprobar (`admin_approve_bank_deposit`) con un clic.  
   **KYC** → marcar `verified/rejected`.  
   **Reportes** → filtra por fecha y exporta CSV.


---
# V6.7 — Roles granulares + Búsqueda y Paginación en Admin
Generado: 2025-09-07 04:45

## Novedades
- **Roles por sección**: `deposits`, `kyc`, `reports` (además de `is_admin`).
- **Búsqueda** y **paginación** en tabs **Depósitos** y **KYC**, filtros en **Reportes**.
- Tabs se **ocultan** si el usuario no tiene rol.

## SQL (añadir a Supabase)
```sql
create table if not exists public.admin_roles(
  email text primary key,
  roles text[] not null default '{}'
);

create or replace function public.has_role(r text) returns boolean language sql stable as $$
  select
    exists(select 1 from public.admin_emails where email = auth.jwt()->>'email')
    or exists(select 1 from public.admin_roles where email = auth.jwt()->>'email' and r = any(roles));
$$;

drop policy if exists admin_bank_deposits on public.bank_deposits;
create policy admin_bank_deposits on public.bank_deposits
  for select to authenticated using (public.is_admin() or public.has_role('deposits'));

drop policy if exists admin_purchases on public.purchases;
create policy admin_purchases on public.purchases
  for select to authenticated using (public.is_admin() or public.has_role('reports'));

drop policy if exists admin_wallet_ledger on public.wallet_ledger;
create policy admin_wallet_ledger on public.wallet_ledger
  for select to authenticated using (public.is_admin() or public.has_role('reports'));

drop policy if exists admin_profiles_select on public.profiles;
create policy admin_profiles_select on public.profiles
  for select to authenticated using (public.is_admin() or public.has_role('kyc'));

drop policy if exists admin_profiles_update on public.profiles;
create policy admin_profiles_update on public.profiles
  for update to authenticated using (public.is_admin() or public.has_role('kyc'))
  with check (public.is_admin() or public.has_role('kyc'));

create or replace function public.admin_approve_bank_deposit(p_ref uuid, p_amount_cents int)
returns void language plpgsql security definer as $$
declare v_user uuid; v_curr text;
begin
  if not (public.is_admin() or public.has_role('deposits')) then raise exception 'not allowed'; end if;
  select user_id, currency into v_user, v_curr from bank_deposits where id = p_ref and status='pending' for update;
  if v_user is null then raise exception 'deposit not found or already processed'; end if;
  update bank_deposits set status='approved', approved_at=now() where id = p_ref;
  insert into wallets(user_id) values (v_user) on conflict (user_id) do nothing;
  update wallets set balance_cents = coalesce(balance_cents,0) + p_amount_cents, updated_at = now() where user_id = v_user;
  insert into wallet_ledger(user_id, type, amount_cents, currency, provider, provider_ref, description)
    values (v_user, 'deposit', p_amount_cents, coalesce(v_curr,'mxn'), 'bank', p_ref::text, 'Depósito bancario aprobado');
end; $$;
revoke all on function public.admin_approve_bank_deposit(uuid, int) from public;
grant execute on function public.admin_approve_bank_deposit(uuid, int) to authenticated;

insert into public.admin_roles(email, roles) values
  ('deposits@tu-dominio.com', array['deposits']),
  ('kyc@tu-dominio.com', array['kyc']),
  ('reportes@tu-dominio.com', array['reports'])
on conflict (email) do update set roles=excluded.roles;
```


---
# V6.8 — Límites por rol, Doble aprobación, Auditoría, PDFs masivos
Generado: 2025-09-07 04:49

## Novedades
- **Límites por rol** (sección Deposits): define umbrales de aprobación y montos máximos.
- **Doble aprobación** automática si el monto supera el umbral configurado.
- **Auditoría** (`admin_actions`) de todo evento sensible (aprobaciones, KYC).
- **Descarga masiva de recibos PDF** (ZIP) por rango de fechas en Reportes.

## SQL — nuevas tablas y RPC
```sql
-- Límites por rol
create table if not exists public.admin_role_limits(
  role text primary key,                                 -- 'deposits', etc.
  single_auto_approve_cents bigint default 200000,       -- hasta aquí 1 aprobación (ej. $2,000.00 MXN)
  dual_required_above_cents bigint default 500000,       -- desde aquí requiere 2 aprobaciones
  max_cents bigint default 2000000                       -- tope absoluto por operación
);

-- Auditoría
create table if not exists public.admin_actions(
  id uuid default gen_random_uuid() primary key,
  actor_email text not null,
  action text not null,        -- 'deposit_first_approve','deposit_final_approve','kyc_update', etc.
  entity text not null,        -- 'bank_deposits','profiles', ...
  ref_id uuid,                 -- id del depósito o null
  amount_cents bigint,
  currency text,
  details jsonb,
  created_at timestamptz default now()
);
alter table public.admin_actions enable row level security;
create policy "view_admin_actions" on public.admin_actions
  for select to authenticated using (public.is_admin() or public.has_role('reports'));

-- Extiende bank_deposits para doble aprobación
alter table public.bank_deposits add column if not exists approved_by1 text;
alter table public.bank_deposits add column if not exists approved_by2 text;
-- estados: 'pending' | 'pending_second' | 'approved' | 'rejected'

-- Helper: email actual desde el JWT
create or replace function public.current_email() returns text language sql stable as $$
  select auth.jwt()->>'email';
$$;

-- Obtiene límites para el rol 'deposits' (o default si no hay)
create or replace function public.get_deposit_limits() returns table(
  single_auto_approve_cents bigint,
  dual_required_above_cents bigint,
  max_cents bigint
) language sql stable as $$
  select l.single_auto_approve_cents, l.dual_required_above_cents, l.max_cents
  from public.admin_role_limits l
  where l.role = 'deposits'
  union all
  select 200000, 500000, 2000000 limit 1
  where not exists (select 1 from public.admin_role_limits where role='deposits');
$$;

-- Primera aprobación: puede dejar en pending_second o aprobar directo si no excede umbral
create or replace function public.admin_approve_bank_deposit_v2(p_ref uuid)
returns text language plpgsql security definer as $$
declare
  v_user uuid; v_curr text; v_amt bigint; v_status text; v_email text;
  lim record;
begin
  if not (public.is_admin() or public.has_role('deposits')) then
    raise exception 'not allowed';
  end if;
  v_email := public.current_email();
  select user_id, currency, expected_cents, status into v_user, v_curr, v_amt, v_status
  from bank_deposits where id = p_ref for update;
  if v_user is null then
    raise exception 'deposit not found';
  end if;
  if v_status <> 'pending' then
    raise exception 'deposit not pending';
  end if;

  select * into lim from public.get_deposit_limits() limit 1;
  if v_amt > lim.max_cents then
    raise exception 'amount exceeds max allowed';
  end if;

  if v_amt >= lim.dual_required_above_cents then
    update bank_deposits set status='pending_second', approved_by1=v_email where id = p_ref;
    insert into admin_actions(actor_email, action, entity, ref_id, amount_cents, currency, details)
      values (v_email, 'deposit_first_approve', 'bank_deposits', p_ref, v_amt, v_curr, jsonb_build_object('note','dual required'));
    return 'pending_second';
  else
    -- aprobar definitivo (una sola aprobación)
    update bank_deposits set status='approved', approved_at=now(), approved_by1=v_email where id = p_ref;
    insert into wallets(user_id) values (v_user) on conflict (user_id) do nothing;
    update wallets set balance_cents = coalesce(balance_cents,0) + v_amt, updated_at = now() where user_id = v_user;
    insert into wallet_ledger(user_id, type, amount_cents, currency, provider, provider_ref, description)
      values (v_user, 'deposit', v_amt, coalesce(v_curr,'mxn'), 'bank', p_ref::text, 'Depósito bancario aprobado (single)');
    insert into admin_actions(actor_email, action, entity, ref_id, amount_cents, currency, details)
      values (v_email, 'deposit_final_approve', 'bank_deposits', p_ref, v_amt, v_curr, jsonb_build_object('mode','single'));
    return 'approved';
  end if;
end;
$$;
revoke all on function public.admin_approve_bank_deposit_v2(uuid) from public;
grant execute on function public.admin_approve_bank_deposit_v2(uuid) to authenticated;

-- Segunda aprobación
create or replace function public.admin_finalize_bank_deposit(p_ref uuid)
returns text language plpgsql security definer as $$
declare
  v_user uuid; v_curr text; v_amt bigint; v_status text; v_first text; v_email text;
begin
  if not (public.is_admin() or public.has_role('deposits')) then
    raise exception 'not allowed';
  end if;
  v_email := public.current_email();
  select user_id, currency, expected_cents, status, approved_by1
  into v_user, v_curr, v_amt, v_status, v_first
  from bank_deposits where id = p_ref for update;
  if v_user is null then
    raise exception 'deposit not found';
  end if;
  if v_status <> 'pending_second' then
    raise exception 'deposit not awaiting second approval';
  end if;
  if v_first = v_email then
    raise exception 'second approver must be different';
  end if;

  update bank_deposits set status='approved', approved_at=now(), approved_by2=v_email where id = p_ref;
  insert into wallets(user_id) values (v_user) on conflict (user_id) do nothing;
  update wallets set balance_cents = coalesce(balance_cents,0) + v_amt, updated_at = now() where user_id = v_user;
  insert into wallet_ledger(user_id, type, amount_cents, currency, provider, provider_ref, description)
    values (v_user, 'deposit', v_amt, coalesce(v_curr,'mxn'), 'bank', p_ref::text, 'Depósito bancario aprobado (dual)');
  insert into admin_actions(actor_email, action, entity, ref_id, amount_cents, currency, details)
    values (v_email, 'deposit_final_approve', 'bank_deposits', p_ref, v_amt, v_curr, jsonb_build_object('mode','dual'));
  return 'approved';
end;
$$;
revoke all on function public.admin_finalize_bank_deposit(uuid) from public;
grant execute on function public.admin_finalize_bank_deposit(uuid) to authenticated;

-- Rechazo (con auditoría)
create or replace function public.admin_reject_bank_deposit(p_ref uuid, p_reason text)
returns text language plpgsql security definer as $$
declare v_status text; v_email text;
begin
  if not (public.is_admin() or public.has_role('deposits')) then raise exception 'not allowed'; end if;
  v_email := public.current_email();
  select status into v_status from bank_deposits where id = p_ref for update;
  if v_status is null then raise exception 'deposit not found'; end if;
  if v_status not in ('pending','pending_second') then raise exception 'cannot reject in this state'; end if;
  update bank_deposits set status='rejected' where id = p_ref;
  insert into admin_actions(actor_email, action, entity, ref_id, details)
    values (v_email, 'deposit_reject', 'bank_deposits', p_ref, jsonb_build_object('reason', p_reason));
  return 'rejected';
end;
$$;
revoke all on function public.admin_reject_bank_deposit(uuid, text) from public;
grant execute on function public.admin_reject_bank_deposit(uuid, text) to authenticated;

-- KYC con auditoría
create or replace function public.admin_set_kyc_status(p_user uuid, p_status text, p_note text default null)
returns void language plpgsql security definer as $$
declare v_email text; begin
  if not (public.is_admin() or public.has_role('kyc')) then raise exception 'not allowed'; end if;
  v_email := public.current_email();
  update profiles set kyc_status=p_status, updated_at=now() where user_id = p_user;
  insert into admin_actions(actor_email, action, entity, ref_id, details)
    values (v_email, 'kyc_update', 'profiles', p_user, jsonb_build_object('status', p_status, 'note', p_note));
end; $$;
revoke all on function public.admin_set_kyc_status(uuid, text, text) from public;
grant execute on function public.admin_set_kyc_status(uuid, text, text) to authenticated;
```
> Ajusta `admin_role_limits` según tus políticas internas.


---
# V6.9 — OTP 2FA, XLSX + Gráficas, Alertas Slack
Generado: 2025-09-07 04:53

## Novedades
- **OTP 2FA por email** para aprobar/finalizar depósitos por encima del umbral.
- **Exportación XLSX** y **gráficas** (ingresos por mes, split por proveedor) en Reportes.
- **Alertas Slack** cuando hay `pending_second`, `approved` o `rejected`.

## SQL extra (OTP)
```sql
create extension if not exists pgcrypto;
create table if not exists public.admin_otps(
  actor_email text not null,
  code_hash text not null,
  expires_at timestamptz not null,
  used boolean default false,
  created_at timestamptz default now()
);
create index if not exists admin_otps_idx on public.admin_otps(actor_email, expires_at) where used=false;

create or replace function public.admin_check_otp(p_code text) returns boolean
language plpgsql security definer as $$
declare v_email text; v_hash text; v_expires timestamptz; v_id timestamptz; ok boolean; begin
  v_email := auth.jwt()->>'email';
  if v_email is null then return false; end if;
  select code_hash, expires_at into v_hash, v_expires
  from admin_otps
  where actor_email = v_email and used=false
  order by created_at desc limit 1;
  if v_hash is null then return false; end if;
  ok := encode(digest(p_code, 'sha256'), 'hex') = v_hash and now() < v_expires;
  if ok then
    update admin_otps set used=true where actor_email=v_email and code_hash=v_hash;
  end if;
  return ok;
end; $$;
revoke all on function public.admin_check_otp(text) from public;
grant execute on function public.admin_check_otp(text) to authenticated;
```
> OTP se envía con Edge Function `send-otp` (usa Resend) y guarda sólo **hash** y **expiry** (5 min por defecto).

## Edge Functions nuevas
- `send-otp` — genera código, guarda hash y lo envía por email (Resend).
- `slack-notify` — envía un payload a Slack (Incoming Webhook).

### Despliegue
```bash
supabase functions deploy send-otp slack-notify

supabase functions secrets set SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=...
supabase functions secrets set RESEND_API_KEY=re_xxx
supabase functions secrets set SLACK_WEBHOOK_URL=https://hooks.slack.com/services/XXX/YYY/ZZZ
```


---
# V7.0 — TOTP (Google Auth), Jobs server-side, Dashboard financiero, Multi-tenant
Generado: 2025-09-07 04:57

## Novedades
- **TOTP 2FA** para admins (Google Auth / Authy): setup con QR y verificación en cada aprobación (si está activo).
- **Jobs server-side**: cola `jobs` + Edge `jobs-runner` para despachar webhooks (Slack/Discord/Email) por cambios en BD.
- **Dashboard financiero** (admin): MRR, Ingresos, ARPU, churn, split por proveedor, cohortes básicas.
- **Multi-tenant / Resellers**: tablas `tenants` y `user_tenants`, selector de tenant en Admin, branding por tenant.

## SQL — Tablas / Triggers / RLS
```sql
-- Tenancy
create table if not exists public.tenants(
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  brand_primary text default '#7c3aed',
  brand_logo_url text
);
create table if not exists public.user_tenants(
  user_id uuid not null,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  role text default 'member',
  primary key (user_id, tenant_id)
);

-- Enlaza entidades a tenant (agrega columna si no existe)
alter table public.bank_deposits add column if not exists tenant_id uuid;
alter table public.purchases add column if not exists tenant_id uuid;
alter table public.wallet_ledger add column if not exists tenant_id uuid;
alter table public.profiles add column if not exists tenant_id uuid;

-- RLS por tenant (además de roles admin)
create or replace function public.my_tenants() returns setof uuid
language sql stable as $$
  select ut.tenant_id from public.user_tenants ut where ut.user_id = auth.uid();
$$;

-- Ejemplo de políticas (ajusta según tus existentes)
drop policy if exists tenant_view_deposits on public.bank_deposits;
create policy tenant_view_deposits on public.bank_deposits
  for select to authenticated using (
    tenant_id is null or tenant_id in (select * from public.my_tenants()) or public.is_admin()
  );

-- Jobs: cola y trigger
create table if not exists public.jobs(
  id uuid primary key default gen_random_uuid(),
  topic text not null,            -- 'slack','discord','email'
  payload jsonb not null,
  run_after timestamptz default now(),
  attempts int default 0,
  max_attempts int default 5,
  status text default 'queued',   -- queued, running, done, failed
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table public.jobs enable row level security;
create policy jobs_admin_view on public.jobs
  for select to authenticated using (public.is_admin() or public.has_role('reports'));

-- Hook: encolar notificaciones de depósitos
create or replace function public.enqueue_deposit_job() returns trigger language plpgsql as $$
begin
  if TG_OP = 'UPDATE' then
    if NEW.status <> OLD.status then
      if NEW.status = 'pending_second' then
        insert into jobs(topic, payload) values ('slack', jsonb_build_object('text', 'Depósito '||NEW.id||' pending_second'));
      elsif NEW.status = 'approved' then
        insert into jobs(topic, payload) values ('slack', jsonb_build_object('text', 'Depósito '||NEW.id||' aprobado'));
      elsif NEW.status = 'rejected' then
        insert into jobs(topic, payload) values ('slack', jsonb_build_object('text', 'Depósito '||NEW.id||' rechazado'));
      end if;
    end if;
  end if;
  return NEW;
end; $$;

drop trigger if exists trg_bank_deposits_jobs on public.bank_deposits;
create trigger trg_bank_deposits_jobs
after update on public.bank_deposits
for each row execute function public.enqueue_deposit_job();

-- TOTP
create table if not exists public.admin_totp(
  actor_email text primary key,
  secret_base32 text not null,
  enabled boolean default true,
  created_at timestamptz default now()
);
-- Optionally add backup codes table
create table if not exists public.admin_backup_codes(
  actor_email text not null,
  code_hash text not null,
  used boolean default false,
  created_at timestamptz default now()
);
create index if not exists admin_backup_idx on public.admin_backup_codes(actor_email, used);

-- Seguridad: solo admins pueden ver/gestionar totp
alter table public.admin_totp enable row level security;
create policy totp_admin_only on public.admin_totp
  for all using (public.is_admin()) with check (public.is_admin());
alter table public.admin_backup_codes enable row level security;
create policy totp_codes_admin_only on public.admin_backup_codes
  for all using (public.is_admin()) with check (public.is_admin());
```

## Edge Functions nuevas
- `totp-setup` — genera secreto base32 y `otpauth://` para QR, guarda por email.
- `totp-verify` — valida un TOTP para el admin actual.
- `jobs-runner` — procesa `jobs` por lotes y llama `slack-notify` / email / discord.

### Despliegue
```bash
supabase functions deploy totp-setup totp-verify jobs-runner
supabase functions secrets set SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=...
# (Slack y Resend ya configurados en V6.9)
```


---
# V7.1 — XLSX de cohortes/metrics por tenant, Discord, Branding por tenant, Invitaciones
Generado: 2025-09-07 05:01

## Novedades
- **Exportar XLSX** de cohortes y métricas (por tenant) en Dashboard.
- **Webhook Discord** (además de Slack), integrado al `jobs-runner` y trigger de depósitos.
- **Branding por tenant** (color primario y logo) aplicado en Admin/Dashboard según tenant activo.
- **Invitaciones por tenant** con **magic-link**: tabla `tenant_invites` + trigger post-signup para asignar rol al ingresar.

## SQL — Invitaciones y roles por tenant
```sql
-- Tabla de invitaciones a tenant
create table if not exists public.tenant_invites(
  id uuid primary key default gen_random_uuid(),
  email text not null,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  role text not null default 'agent',        -- owner | manager | agent
  invited_by text,
  created_at timestamptz default now(),
  unique (email, tenant_id)
);
alter table public.tenant_invites enable row level security;
create policy tenant_invites_admin on public.tenant_invites
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Roles por tenant (owner/manager/agent) ya en user_tenants.role

-- Trigger: al crear profile, si su email tiene invitación vigente, liga el tenant/rol
create or replace function public.link_tenant_on_profile() returns trigger language plpgsql as $$
declare v_email text; v_tid uuid; v_role text; begin
  v_email := NEW.email;
  select tenant_id, role into v_tid, v_role
  from tenant_invites where email = v_email order by created_at desc limit 1;
  if v_tid is not null then
    insert into user_tenants(user_id, tenant_id, role) values (NEW.user_id, v_tid, coalesce(v_role,'agent'))
    on conflict do nothing;
  end if;
  return NEW;
end; $$;

drop trigger if exists trg_link_tenant_on_profile on public.profiles;
create trigger trg_link_tenant_on_profile
after insert on public.profiles
for each row execute function public.link_tenant_on_profile();
```

## Webhooks Discord
- Nueva Edge: `discord-notify` (Incoming Webhook).
- `jobs-runner` ahora manda a Slack **y** Discord si hay `discord_text` o si `topic='discord'`.

### Despliegue
```bash
supabase functions deploy discord-notify
supabase functions secrets set DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/XXX/YYY
```


---
# V7.2 — ACL por Tenant, Embeds Slack/Discord, Export cross-tenant, Teams con límites
Generado: 2025-09-07 05:04

## Novedades
- **ACL por Tenant** (reports/kyc/deposits/admin) vía `tenant_roles` + `has_tenant_cap()` y RLS actualizadas.
- **Embeds ricos** en Slack/Discord (jobs admiten `attachments/blocks` o `embeds`).
- **Export cross-tenant (XLSX)** con pivots: ingresos por **tenant**, **proveedor** y **mes**.
- **Teams/subcuentas** con límites mensuales; asignación de miembros por correo.

## SQL — Roles por tenant y ACL
```sql
-- Catálogo de roles por tenant y capacidades
create table if not exists public.tenant_roles(
  role text primary key,
  can_reports boolean default false,
  can_kyc boolean default false,
  can_deposits boolean default false,
  can_admin boolean default false
);

insert into tenant_roles(role, can_reports, can_kyc, can_deposits, can_admin) values
  ('owner', true, true, true, true),
  ('manager', true, true, true, false),
  ('agent', false, false, true, false)
on conflict (role) do nothing;

-- Función: ¿usuario actual tiene capacidad 'cap' en tenant dado?
create or replace function public.has_tenant_cap(cap text, tid uuid) returns boolean
language sql stable as $$
  select
    public.is_admin() or exists(
      select 1
      from public.user_tenants ut
      join public.tenant_roles tr on tr.role = ut.role
      where ut.user_id = auth.uid() and ut.tenant_id = tid and (
        (cap='admin' and tr.can_admin) or
        (cap='reports' and tr.can_reports) or
        (cap='kyc' and tr.can_kyc) or
        (cap='deposits' and tr.can_deposits)
      )
    );
$$;

-- Políticas por tenant (ejemplos; ajusta según tus existentes)
drop policy if exists tenant_view_deposits on public.bank_deposits;
create policy tenant_view_deposits on public.bank_deposits
  for select to authenticated using (
    tenant_id is null or public.is_admin() or public.has_tenant_cap('deposits', tenant_id)
  );

drop policy if exists tenant_view_purchases on public.purchases;
create policy tenant_view_purchases on public.purchases
  for select to authenticated using (
    tenant_id is null or public.is_admin() or public.has_tenant_cap('reports', tenant_id)
  );

drop policy if exists tenant_view_wallet on public.wallet_ledger;
create policy tenant_view_wallet on public.wallet_ledger
  for select to authenticated using (
    tenant_id is null or public.is_admin() or public.has_tenant_cap('reports', tenant_id)
  );

drop policy if exists tenant_profiles_select on public.profiles;
create policy tenant_profiles_select on public.profiles
  for select to authenticated using (
    tenant_id is null or public.is_admin() or public.has_tenant_cap('kyc', tenant_id)
  );
```

## SQL — Teams & Límites
```sql
create table if not exists public.teams(
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null,
  monthly_limit_cents bigint default 0,
  active boolean default true,
  created_at timestamptz default now()
);
create table if not exists public.user_teams(
  user_id uuid not null,
  team_id uuid not null references public.teams(id) on delete cascade,
  role text default 'member',
  primary key (user_id, team_id)
);

-- Extiende tablas para referenciar team
alter table public.purchases add column if not exists team_id uuid;
alter table public.wallet_ledger add column if not exists team_id uuid;

-- Helper: gasto del mes por team
create or replace function public.team_month_spend_cents(p_team uuid) returns bigint language sql stable as $$
  select coalesce(sum(amount_cents),0) from public.wallet_ledger
  where team_id = p_team and created_at >= date_trunc('month', now());
$$;

-- ¿puede gastar este equipo?
create or replace function public.team_can_spend(p_team uuid, p_amount_cents bigint) returns boolean
language sql stable as $$
  select (select monthly_limit_cents from public.teams where id=p_team) = 0
     or ( public.team_month_spend_cents(p_team) + coalesce(p_amount_cents,0) ) <=
        (select monthly_limit_cents from public.teams where id=p_team);
$$;
revoke all on function public.team_can_spend(uuid, bigint) from public;
grant execute on function public.team_can_spend(uuid, bigint) to authenticated;
```

## Webhooks — Embeds
- `slack-notify` ahora acepta payload libre (`text`, `attachments`, `blocks`).
- `discord-notify` acepta `content` y/o `embeds`.

### Despliegue
```bash
supabase functions deploy slack-notify discord-notify
```


---
# V7.3 — Enforced team limits, Embeds pro, FX normalization, Audit export
Generado: 2025-09-07 05:09

## Novedades
- **Enforcement server-side** de límites por team (triggers en `wallet_ledger` y `purchases`).
- **Embeds pro** en Slack/Discord desde la cola de `jobs` (payload rico con colores y campos).
- **Normalización FX** (MXN) en Reportes/Dashboard con tabla `fx_rates`.
- **Export Auditoría (ZIP)** de `admin_actions` por rango/tenant con hash de integridad (HMAC).

## SQL — Enforcement y FX
```sql
-- FX rates simples (manual o job de actualización)
create table if not exists public.fx_rates(
  currency text primary key,
  rate_to_mxn numeric not null,             -- 1 unidad de currency = X MXN
  updated_at timestamptz default now()
);

create or replace function public.fx_to_mxn(p_currency text, p_amount_cents bigint) returns bigint
language sql stable as $$
  select ceil( coalesce(p_amount_cents,0) * coalesce((select rate_to_mxn from fx_rates where upper(currency)=upper(p_currency)), 1)::numeric );
$$;
revoke all on function public.fx_to_mxn(text, bigint) from public;
grant execute on function public.fx_to_mxn(text, bigint) to authenticated;

-- Enforce en wallet_ledger: bloquea si team excede límite
create or replace function public.enforce_team_limit_wallet() returns trigger
language plpgsql as $$
begin
  if NEW.team_id is not null and NEW.type in ('spend','purchase') then
    if not public.team_can_spend(NEW.team_id, NEW.amount_cents) then
      raise exception 'team monthly limit exceeded';
    end if;
  end if;
  return NEW;
end; $$;
drop trigger if exists trg_enforce_wallet on public.wallet_ledger;
create trigger trg_enforce_wallet before insert on public.wallet_ledger
for each row execute function public.enforce_team_limit_wallet();

-- Enforce en purchases: previo a crear compra
create or replace function public.enforce_team_limit_purchase() returns trigger
language plpgsql as $$
begin
  if NEW.team_id is not null then
    if not public.team_can_spend(NEW.team_id, NEW.amount_cents) then
      raise exception 'team monthly limit exceeded';
    end if;
  end if;
  return NEW;
end; $$;
drop trigger if exists trg_enforce_purchase on public.purchases;
create trigger trg_enforce_purchase before insert on public.purchases
for each row execute function public.enforce_team_limit_purchase();
```

## SQL — Auditoría firmada (HMAC en DB)
```sql
create extension if not exists pgcrypto;

-- Secreto HMAC (guárdalo y restringe acceso)
create table if not exists public.audit_secret(
  id boolean primary key default true,
  secret text not null
);
-- Setea tu secreto: insert into audit_secret(secret) values ('cambia_estO_!'); on conflict (id) do update set secret=excluded.secret;

-- Firma HMAC-SHA256 sobre (actor|entity|action|ref|timestamp|details)
create or replace function public.audit_sign(p_actor text, p_entity text, p_action text, p_ref uuid, p_created timestamptz, p_details jsonb)
returns text language sql stable as $$
  select encode(hmac(
    coalesce(p_actor,'') || '|' || coalesce(p_entity,'') || '|' || coalesce(p_action,'') || '|' ||
    coalesce(p_ref::text,'') || '|' || coalesce(p_created::text,'') || '|' || coalesce(p_details::text,''),
    (select secret from audit_secret limit 1),
    'sha256'
  ), 'hex');
$$;

alter table public.admin_actions add column if not exists sig text;
create or replace function public.audit_backfill_sign() returns void language plpgsql as $$
declare r record; begin
  for r in select * from admin_actions loop
    update admin_actions set sig = public.audit_sign(r.actor_email, r.entity, r.action, r.ref_id, r.created_at, r.details)
    where id = r.id;
  end loop;
end; $$;
```

## Jobs — Embeds pro
```sql
-- Ajusta el trigger de depósitos para meter payloads ricos
create or replace function public.enqueue_deposit_job() returns trigger language plpgsql as $$
declare txt text; clr text; begin
  if TG_OP = 'UPDATE' and NEW.status <> OLD.status then
    if NEW.status = 'pending_second' then
      txt := 'Depósito '||NEW.id||' requiere 2da aprobación';
      clr := '#f59e0b';
    elsif NEW.status = 'approved' then
      txt := 'Depósito '||NEW.id||' aprobado';
      clr := '#10b981';
    elsif NEW.status = 'rejected' then
      txt := 'Depósito '||NEW.id||' rechazado';
      clr := '#ef4444';
    end if;
    if txt is not null then
      insert into jobs(topic, payload) values ('slack', jsonb_build_object(
        'text', txt,
        'attachments', jsonb_build_array(jsonb_build_object('color', clr, 'fields', jsonb_build_array(
          jsonb_build_object('title','User','value', coalesce(NEW.user_id::text,''),'short',true),
          jsonb_build_object('title','Monto','value', (NEW.expected_cents/100)::text || ' ' || upper(coalesce(NEW.currency,'mxn')),'short',true)
        )))
      ));
      insert into jobs(topic, payload) values ('discord', jsonb_build_object(
        'content', txt,
        'embeds', jsonb_build_array(jsonb_build_object('color', 5814783, 'fields', jsonb_build_array(
          jsonb_build_object('name','User','value', coalesce(NEW.user_id::text,'')),
          jsonb_build_object('name','Monto','value', (NEW.expected_cents/100)::text || ' ' || upper(coalesce(NEW.currency,'mxn')))
        )))
      ));
    end if;
  end if;
  return NEW;
end; $$;
```


---
# V7.4 — FX updater (cron), KMS signatures, Políticas (op/diarias) + métricas
Generado: 2025-09-07 05:12

## Novedades
- **Actualizador FX (cron)**: Edge `fx-update` que trae tipos de cambio y **upsert** a `fx_rates`. Lista para **programar cada 12h**.
- **Firmas con AWS KMS** para auditoría: Edge `audit-sign-kms` genera **firma base64** del CSV; el zip incluye `admin_actions.sig`.
- **Políticas por tenant**: tope **por operación** y **diario por usuario**, con logs en `policy_events` y métricas en el dashboard (**Bloqueos 24h**).
- UI: sección **Políticas** en pestaña **Tenants** para configurar límites.

## SQL — Políticas por tenant (op/día) y eventos
```sql
-- Limites por tenant
create table if not exists public.policy_limits(
  tenant_id uuid primary key references public.tenants(id) on delete cascade,
  max_op_cents bigint default 0,            -- 0 = sin tope
  max_daily_user_cents bigint default 0,    -- 0 = sin tope
  updated_at timestamptz default now()
);

-- Eventos de políticas (bloqueos)
create table if not exists public.policy_events(
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid,
  user_id uuid,
  kind text not null,         -- 'max_op' | 'max_daily_user'
  amount_cents bigint,
  created_at timestamptz default now(),
  details jsonb
);
alter table public.policy_events enable row level security;
create policy view_policy_events on public.policy_events
  for select to authenticated using (public.is_admin() or public.has_role('reports'));

-- Helpers
create or replace function public.policy_get(tenant uuid) returns policy_limits language sql stable as $$
  select * from policy_limits where tenant_id = tenant;
$$;

create or replace function public.daily_user_spend_cents(p_user uuid) returns bigint language sql stable as $$
  select coalesce(sum(amount_cents),0) from public.wallet_ledger
   where user_id = p_user and created_at >= date_trunc('day', now());
$$;

-- Enforcements en purchases + wallet_ledger (además de team_can_spend de V7.2)
create or replace function public.enforce_policies_purchase() returns trigger
language plpgsql as $$
declare lim policy_limits; v_daily bigint; begin
  if NEW.tenant_id is not null then
    select * into lim from policy_limits where tenant_id = NEW.tenant_id;
    if lim.max_op_cents is not null and lim.max_op_cents > 0 and NEW.amount_cents > lim.max_op_cents then
      insert into policy_events(tenant_id, user_id, kind, amount_cents, details) values (NEW.tenant_id, NEW.user_id, 'max_op', NEW.amount_cents, jsonb_build_object('purchase_id', NEW.id));
      raise exception 'max per operation exceeded';
    end if;
    if lim.max_daily_user_cents is not null and lim.max_daily_user_cents > 0 then
      select public.daily_user_spend_cents(NEW.user_id) into v_daily;
      if v_daily + coalesce(NEW.amount_cents,0) > lim.max_daily_user_cents then
        insert into policy_events(tenant_id, user_id, kind, amount_cents, details) values (NEW.tenant_id, NEW.user_id, 'max_daily_user', NEW.amount_cents, jsonb_build_object('purchase_id', NEW.id, 'accum', v_daily));
        raise exception 'daily user limit exceeded';
      end if;
    end if;
  end if;
  return NEW;
end; $$;

drop trigger if exists trg_enforce_policies_purchase on public.purchases;
create trigger trg_enforce_policies_purchase before insert on public.purchases
for each row execute function public.enforce_policies_purchase();

create or replace function public.enforce_policies_wallet() returns trigger
language plpgsql as $$
declare lim policy_limits; v_daily bigint; begin
  if NEW.tenant_id is not null and NEW.type in ('spend','purchase') then
    select * into lim from policy_limits where tenant_id = NEW.tenant_id;
    if lim.max_op_cents is not null and lim.max_op_cents > 0 and NEW.amount_cents > lim.max_op_cents then
      insert into policy_events(tenant_id, user_id, kind, amount_cents, details) values (NEW.tenant_id, NEW.user_id, 'max_op', NEW.amount_cents, jsonb_build_object('ledger_id', NEW.id));
      raise exception 'max per operation exceeded';
    end if;
    if lim.max_daily_user_cents is not null and lim.max_daily_user_cents > 0 then
      select public.daily_user_spend_cents(NEW.user_id) into v_daily;
      if v_daily + coalesce(NEW.amount_cents,0) > lim.max_daily_user_cents then
        insert into policy_events(tenant_id, user_id, kind, amount_cents, details) values (NEW.tenant_id, NEW.user_id, 'max_daily_user', NEW.amount_cents, jsonb_build_object('ledger_id', NEW.id, 'accum', v_daily));
        raise exception 'daily user limit exceeded';
      end if;
    end if;
  end if;
  return NEW;
end; $$;

drop trigger if exists trg_enforce_policies_wallet on public.wallet_ledger;
create trigger trg_enforce_policies_wallet before insert on public.wallet_ledger
for each row execute function public.enforce_policies_wallet();
```

## Edge — FX updater
- `fx-update` obtiene tipos de cambio de tu proveedor (configurable) y **upsert** a `fx_rates`.
- Programa con **cron** (ej. cada 12h).

### Despliegue
```bash
supabase functions deploy fx-update audit-sign-kms

# Secrets necesarios
supabase functions secrets set SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=...
supabase functions secrets set FX_API_URL=https://open.er-api.com/v6/latest/USD   # ejemplo gratis
# O usa tu proveedor: FX_API_URL=https://api.currencyapi.com/v3/latest  FX_API_KEY=ca_live_xxx

# Programar cada 12 horas (Supabase Scheduled Triggers)
supabase functions schedule create fx-update --cron "0 */12 * * *"
```


---
# V7.5 — Rate limiter por usuario, Detección de anomalías, PWA + Push
Generado: 2025-09-07 05:16

## Novedades
- **Rate limiter por usuario (dinámico)**: tope diario como % del promedio histórico (rolling) o tope fijo por usuario.
- **Detección de anomalías en depósitos**: z-score + reglas y encolado de alertas (Slack/Discord/Push).
- **PWA + Push**: manifest y service worker; registro de **Web Push** con VAPID; jobs envían push a aprobadores.

## SQL — Rate limiter por usuario
```sql
-- Límite por usuario (opcional además de políticas por tenant)
create table if not exists public.user_rate_limits(
  user_id uuid primary key,
  daily_pct_cap int default 200,            -- 200 = 200% del promedio diario rolling
  fixed_daily_cents bigint default 0,       -- 0 = sin tope fijo
  days_window int default 30,
  updated_at timestamptz default now()
);

-- Promedio diario rolling (últimos N días) sobre gastos (wallet_ledger.type in spend/purchase)
create or replace function public.user_daily_avg_cents(p_user uuid, p_days int default 30) returns bigint
language sql stable as $$
  with days as (
    select generate_series(date_trunc('day', now()) - (p_days||' days')::interval, date_trunc('day', now()), '1 day') d
  ),
  agg as (
    select date_trunc('day', created_at) d, sum(amount_cents) cents
    from public.wallet_ledger
    where user_id = p_user and type in ('spend','purchase')
      and created_at >= date_trunc('day', now()) - (p_days||' days')::interval
    group by 1
  )
  select coalesce(avg(agg.cents)::bigint, 0) from days
  left join agg using (d);
$$;

-- ¿Cumple el rate limit?
create or replace function public.user_rate_allow(p_user uuid, p_amount_cents bigint) returns boolean
language sql stable as $$
  select case
    when not exists (select 1 from user_rate_limits where user_id=p_user) then true
    else (
      select
        case
          when coalesce(fixed_daily_cents,0) > 0 and public.daily_user_spend_cents(p_user) + p_amount_cents > fixed_daily_cents
            then false
          else
            ( public.daily_user_spend_cents(p_user) + p_amount_cents ) <=
            ( (coalesce(daily_pct_cap,200) / 100.0) * greatest(100::bigint, public.user_daily_avg_cents(p_user, coalesce(days_window,30))) )
        end
      from user_rate_limits where user_id=p_user
    )
  end;
$$;
revoke all on function public.user_rate_allow(uuid, bigint) from public;
grant execute on function public.user_rate_allow(uuid, bigint) to authenticated;

-- Enforcement adicional en purchases/wallet_ledger
create or replace function public.enforce_rate_user_purchase() returns trigger
language plpgsql as $$
begin
  if NEW.user_id is not null then
    if not public.user_rate_allow(NEW.user_id, NEW.amount_cents) then
      raise exception 'user daily rate limit exceeded';
    end if;
  end if;
  return NEW;
end; $$;
drop trigger if exists trg_enforce_rate_purchase on public.purchases;
create trigger trg_enforce_rate_purchase before insert on public.purchases
for each row execute function public.enforce_rate_user_purchase();

create or replace function public.enforce_rate_user_wallet() returns trigger
language plpgsql as $$
begin
  if NEW.user_id is not null and NEW.type in ('spend','purchase') then
    if not public.user_rate_allow(NEW.user_id, NEW.amount_cents) then
      raise exception 'user daily rate limit exceeded';
    end if;
  end if;
  return NEW;
end; $$;
drop trigger if exists trg_enforce_rate_wallet on public.wallet_ledger;
create trigger trg_enforce_rate_wallet before insert on public.wallet_ledger
for each row execute function public.enforce_rate_user_wallet();
```

## SQL — Detección de anomalías en depósitos
```sql
create table if not exists public.anomalies(
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid,
  ref_id uuid,                -- bank_deposits.id
  kind text not null,         -- 'deposit'
  score numeric,              -- z-score aproximado
  reason text,
  status text default 'open', -- open | closed | ignored
  created_at timestamptz default now()
);

-- Calcula z-score y aplica reglas base
create or replace function public.detect_deposit_anomaly(p_ref uuid) returns boolean
language plpgsql as $$
declare v_user uuid; v_amt bigint; v_curr text; v_tid uuid;
        mu numeric; sigma numeric; z numeric; reason text; is_anom boolean:=false;
begin
  select user_id, expected_cents, currency, tenant_id into v_user, v_amt, v_curr, v_tid from bank_deposits where id=p_ref;
  if v_user is null then return false; end if;

  -- estadísticos user últimos 90d
  select avg(expected_cents)::numeric, nullif(stddev_pop(expected_cents),0)::numeric
    into mu, sigma
  from bank_deposits
  where user_id = v_user and status in ('pending','pending_second','approved')
    and created_at >= now() - interval '90 days' and id <> p_ref;

  if mu is null then mu := 0; end if;
  if sigma is null then sigma := 1; end if;

  z := (v_amt - mu) / sigma;

  if z > 3 then is_anom := true; reason := 'zscore>3'; end if;
  if v_amt >= (select dual_required_above_cents from get_deposit_limits() limit 1) then
    is_anom := true; reason := coalesce(reason,'') || ' dual_threshold'; end if;

  insert into anomalies(tenant_id, ref_id, kind, score, reason)
  values (v_tid, p_ref, 'deposit', z, coalesce(reason,'baseline'));

  return is_anom;
end; $$;

-- Trigger: al pasar a pending / pending_second evalúa
create or replace function public.trg_detect_deposit_anomaly_fn() returns trigger language plpgsql as $$
declare flagged boolean; begin
  if TG_OP='INSERT' or (TG_OP='UPDATE' and NEW.status<>OLD.status) then
    if NEW.status in ('pending','pending_second') then
      perform public.detect_deposit_anomaly(NEW.id);
      -- Encola push/slack si score o regla dispara
      insert into jobs(topic, payload) values ('push', jsonb_build_object('title','Depósito sospechoso','text','Ref '||NEW.id));
    end if;
  end if;
  return NEW;
end; $$;
drop trigger if exists trg_detect_deposit_anomaly on public.bank_deposits;
create trigger trg_detect_deposit_anomaly
after insert or update on public.bank_deposits
for each row execute function public.trg_detect_deposit_anomaly_fn();
```

## PWA + Push (Web Push con VAPID)
```sql
create table if not exists public.push_subscriptions(
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  email text,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  tenant_id uuid,
  created_at timestamptz default now()
);
```

**Edge Functions nuevas**
- `push-register` — guarda la suscripción Web Push para el usuario actual.
- `push-broadcast` — envía notificaciones (VAPID) a aprobadores (admins/roles deposits) y limpia endpoints inválidos.

### Despliegue
```bash
supabase functions deploy push-register push-broadcast
supabase functions secrets set SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=...
supabase functions secrets set VAPID_PUBLIC_KEY=BPUBLICKEY... VAPID_PRIVATE_KEY=xxxxxxxx VAPID_SUBJECT=mailto:admin@tu-dominio.com
```


---
# V7.6 — One‑tap móvil, Deep links, Risk scoring + Priority, Antifraude
Generado: 2025-09-07 05:19

## Novedades
- **Aprobación móvil one‑tap** con **deep link** (`approve.html?id=...&stage=first|final`). Requiere sesión admin; usa **TOTP/OTP** si aplica.
- **Risk scoring** para depósitos (`risk_assessments`) con bandas **low/medium/high** y factores (z‑score, KYC, historial).
- **Priority queue** en `jobs` (columna `priority`) para atender antes eventos de **alto riesgo**.
- **Panel Antifraude** (nueva pestaña en Admin) con **timeline por usuario** y **mapa de señales**.

## SQL — Risk scoring + Priority
```sql
-- Tabla de evaluaciones de riesgo
create table if not exists public.risk_assessments(
  id uuid primary key default gen_random_uuid(),
  ref_id uuid not null,          -- bank_deposits.id
  kind text not null default 'deposit',
  score numeric not null,
  band text not null,            -- low | medium | high
  factors jsonb,
  created_at timestamptz default now()
);
alter table public.risk_assessments enable row level security;
create policy risk_view on public.risk_assessments
  for select to authenticated using (public.is_admin() or public.has_role('reports'));

-- Columna de prioridad en jobs (1=alta, 9=baja)
alter table public.jobs add column if not exists priority smallint default 5;
create index if not exists jobs_sched_idx on public.jobs(status, run_after, priority);

-- Función de score de riesgo para depósitos
create or replace function public.risk_score_deposit(p_ref uuid) returns numeric
language plpgsql as $$
declare v_user uuid; v_amt bigint; v_curr text; v_tid uuid;
        mu numeric; sigma numeric; z numeric; kyc text; rej int; anom int;
        s numeric := 0; dual bigint;
begin
  select user_id, expected_cents, currency, tenant_id into v_user, v_amt, v_curr, v_tid from bank_deposits where id=p_ref;
  if v_user is null then return 0; end if;

  select avg(expected_cents)::numeric, nullif(stddev_pop(expected_cents),0)::numeric
    into mu, sigma
  from bank_deposits where user_id=v_user and created_at>=now()-interval '90 days' and id<>p_ref;
  if mu is null then mu := 0; end if; if sigma is null then sigma := 1; end if;
  z := greatest(0, (v_amt - mu) / sigma);
  s := s + least(10, z);                      -- hasta 10 pts por z-score

  select (select dual_required_above_cents from get_deposit_limits() limit 1) into dual;
  if v_amt >= dual then s := s + 5; end if;   -- umbral dual

  select kyc_status into kyc from profiles where user_id = v_user;
  if kyc is null or kyc in ('none','rejected') then s := s + 5;
  elsif kyc in ('pending') then s := s + 2;
  end if;

  select count(*) into rej from admin_actions where entity='bank_deposits' and action='deposit_reject' and ref_id in (select id from bank_deposits where user_id=v_user);
  s := s + least(5, rej);                     -- historial rechazos (cap 5)

  select count(*) into anom from anomalies where ref_id=p_ref;
  s := s + least(2, anom);                    -- señal de anomalía inmediata

  return s;
end; $$;

-- Guarda evaluación y encola prioridad según banda
create or replace function public.assess_and_enqueue(p_ref uuid) returns text
language plpgsql as $$
declare sc numeric; band text; prio smallint := 5; txt text; begin
  sc := public.risk_score_deposit(p_ref);
  if sc >= 12 then band := 'high'; prio := 1;
  elsif sc >= 7 then band := 'medium'; prio := 3;
  else band := 'low'; prio := 5;
  end if;
  insert into risk_assessments(ref_id, score, band, factors)
    values (p_ref, sc, band, jsonb_build_object('note','auto score'));
  txt := 'Riesgo '||band||' ('||sc||') en depósito '||p_ref;
  insert into jobs(topic, payload, priority) values ('slack', jsonb_build_object('text', txt), prio);
  return band;
end; $$;
revoke all on function public.assess_and_enqueue(uuid) from public;
grant execute on function public.assess_and_enqueue(uuid) to authenticated;

-- Trigger: cuando depósito esté pendiente, evaluar riesgo
create or replace function public.trg_score_deposit_fn() returns trigger language plpgsql as $$
begin
  if TG_OP='INSERT' or (TG_OP='UPDATE' and NEW.status<>OLD.status) then
    if NEW.status in ('pending','pending_second') then
      perform public.assess_and_enqueue(NEW.id);
    end if;
  end if;
  return NEW;
end; $$;
drop trigger if exists trg_score_deposit on public.bank_deposits;
create trigger trg_score_deposit after insert or update on public.bank_deposits
for each row execute function public.trg_score_deposit_fn();
```

## One‑tap y Deep links
- Nueva página `approve.html` para aprobar/rechazar rápido desde móvil. Requiere sesión admin/role `deposits` y respeta **TOTP/OTP**.
- Botón **Copiar link** en la cola de depósitos genera `approve.html?id=UUID&stage=first|final` según estado.
- `jobs-runner` incluye `url` al **one‑tap** en notificaciones **push**/**Discord**/**Slack** cuando hay `pending`/`pending_second`.

## Panel Antifraude
- Nueva pestaña **Fraude** en Admin: busca por **email o user_id**, muestra **timeline** (depósitos, compras, anomalías, acciones admin) y **mapa de señales** (bandas por fecha).

### Despliegue
1) Ejecuta el bloque SQL de V7.6 (arriba).  
2) Abre `admin.html` → pestaña **Fraude**.  
3) Prueba un **push** en un depósito `pending_second` y aprueba desde `approve.html`.

## Nota: Enlace one‑tap en jobs
Actualiza tu función `enqueue_deposit_job()` para incluir `payload.url = '/approve.html?id=UUID&stage=...'` según el estado.
Ejemplo (fragmento):
```sql
-- dentro de enqueue_deposit_job()
    insert into jobs(topic, payload, priority)
    values ('push', jsonb_build_object(
      'title', 'Depósito pendiente',
      'text', txt,
      'url', '/approve.html?id='||NEW.id||'&stage='||(case when NEW.status='pending_second' then 'final' else 'first' end)
    ), prio);
```


---
# V7.7 — Swipe in‑app, Rules editor, Auto‑hold (cola de retención)
Generado: 2025-09-07 05:23

## Novedades
- **Swipe approvals (in‑app)**: modo tarjetas con gesto izquierda = **rechazar**, derecha = **aprobar**. Ideal en móvil.
- **Rules Editor (JSON)**: tabla `risk_rules` y editor UI; reglas activas alimentan un `risk_apply_rules()` para subir score o forzar **auto‑hold**.
- **Auto‑hold**: si banda = `high` o si una regla fuerza hold → estado `on_hold` y envío a cola prioritaria.

## SQL — Rules + Auto‑hold
```sql
-- Reglas de riesgo
create table if not exists public.risk_rules(
  name text primary key,
  content jsonb not null,          -- JSON con reglas
  active boolean default true,
  updated_at timestamptz default now()
);
alter table public.risk_rules enable row level security;
create policy rules_admin on public.risk_rules
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Estado on_hold para depósitos (si no existe lógicamente en tu app)
-- (No requiere DDL si usas free-form en status; si tienes enum, agrégalo)
-- alter type deposit_status add value 'on_hold';

-- Aplica reglas a un depósito; devuelve efecto: 'none'|'raise'|'hold'
create or replace function public.risk_apply_rules(p_ref uuid) returns text
language plpgsql as $$
declare v jsonb; dep record; effect text := 'none'; begin
  select * into dep from bank_deposits where id = p_ref;
  for v in select content from risk_rules where active loop
    -- Ejemplos simples: monto >= X, moneda, país de perfil, proveedor bancario
    if (v->>'type') = 'amount_gte' and dep.expected_cents >= ((v->>'cents')::bigint) then
      effect := coalesce(v->>'effect','raise');  -- 'raise' suma score; 'hold' fuerza hold
    end if;
    if (v->>'type') = 'currency_is' and upper(coalesce(dep.currency,'')) = upper(v->>'code') then
      effect := greatest(effect, coalesce(v->>'effect','raise'));
    end if;
  end loop;
  return effect;
end; $$;

-- Extiende assess_and_enqueue para aplicar reglas y auto‑hold
create or replace function public.assess_and_enqueue(p_ref uuid) returns text
language plpgsql as $$
declare sc numeric; band text; prio smallint := 5; txt text; eff text; begin
  sc := public.risk_score_deposit(p_ref);
  eff := public.risk_apply_rules(p_ref);
  if eff = 'raise' then sc := sc + 3; end if;

  if sc >= 12 or eff = 'hold' then band := 'high'; prio := 1;
  elsif sc >= 7 then band := 'medium'; prio := 3;
  else band := 'low'; prio := 5;
  end if;

  insert into risk_assessments(ref_id, score, band, factors)
    values (p_ref, sc, band, jsonb_build_object('rules_effect', eff))
  on conflict do nothing;

  -- Auto‑hold si high
  if band = 'high' then
    update bank_deposits set status='on_hold' where id = p_ref and status in ('pending','pending_second');
    txt := 'Depósito '||p_ref||' en hold por riesgo alto';
    insert into jobs(topic, payload, priority) values ('push', jsonb_build_object('title','En revisión','text', txt, 'url','/admin.html?tab=deposits'), prio);
  else
    txt := 'Riesgo '||band||' ('||sc||') en depósito '||p_ref;
    insert into jobs(topic, payload, priority) values ('slack', jsonb_build_object('text', txt), prio);
  end if;
  return band;
end; $$;
```

## UI — Dónde usarlo
- **Admin → Depósitos**: botón **“Modo Swipe”** (mobile‑first). Cards con gesto izquierda/derecha o botones.
- **Admin → Rules** (nueva pestaña): textarea JSON con **Validar** y **Guardar**. Reglas activas **ya** influyen en riesgo/hold.
- **Cola `on_hold`**: los depósitos en estado `on_hold` se muestran junto a pendientes con badge **HOLD**.


---
# V7.8 — Visual Rules, Auto‑triage + Queues con SLA, Batch + Undo 10s
Generado: 2025-09-07 05:27

## Novedades
- **Visual Rules Builder** (UI) que compila a JSON y guarda en `risk_rules`. Soporta condiciones: `amount_gte`, `currency_is`, `country_is`, `provider_is`, y acción `raise|hold`.
- **Auto‑triage por colas** con **SLA**: tabla `queues` y `deposit_queues`; función `autotriage_deposit(ref)` asigna cola según **país**, **proveedor** y **banda de riesgo**. Métricas por cola (pendientes, vencidos SLA, TTR promedio).
- **Batch actions + Undo (10s)** en Depósitos: selecciona múltiples, **Aprobar/Rechazar** en lote y aparece snackbar con **Deshacer** dentro de 10s antes de confirmar.

## SQL — Queues + Auto‑triage + Métricas
```sql
-- Colas
create table if not exists public.queues(
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid,
  slug text unique,
  name text not null,
  sla_minutes int default 60,
  region text,         -- filtro opcional por país/region del usuario
  provider text,       -- filtro opcional por banco/proveedor
  priority int default 5,
  created_at timestamptz default now()
);
alter table public.queues enable row level security;
create policy queues_view on public.queues for select to authenticated using (true);
create policy queues_admin on public.queues for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Relación depósito-cola
create table if not exists public.deposit_queues(
  deposit_id uuid primary key references public.bank_deposits(id) on delete cascade,
  queue_id uuid references public.queues(id) on delete set null,
  assigned_at timestamptz default now(),
  assigned_by text,
  resolved_at timestamptz
);
alter table public.deposit_queues enable row level security;
create policy dq_view on public.deposit_queues for select to authenticated using (true);
create policy dq_admin on public.deposit_queues for all to authenticated using (public.is_admin() or public.has_tenant_cap('deposits', (select tenant_id from bank_deposits where id=deposit_id)));

-- Función: elegir cola
create or replace function public.autotriage_deposit(p_ref uuid) returns uuid
language plpgsql as $$
declare dep record; q record; dest uuid; ucountry text; begin
  select * into dep from bank_deposits where id = p_ref;
  if dep is null then return null; end if;
  select country into ucountry from profiles where user_id = dep.user_id;

  -- 1) match por provider
  select id into dest from queues where (provider is not null and provider = dep.bank_provider) order by priority asc, created_at asc limit 1;
  -- 2) match por país
  if dest is null and ucountry is not null then
    select id into dest from queues where (region is not null and lower(region) = lower(ucountry)) order by priority asc, created_at asc limit 1;
  end if;
  -- 3) banda de riesgo: si hay evaluación high → intenta cola 'fraude' (slug)
  if dest is null then
    if exists(select 1 from risk_assessments where ref_id = p_ref and band='high') then
      select id into dest from queues where slug='fraude' limit 1;
    end if;
  end if;
  -- 4) fallback: primera por prioridad
  if dest is null then
    select id into dest from queues order by priority asc, created_at asc limit 1;
  end if;

  if not exists(select 1 from deposit_queues where deposit_id = p_ref) then
    insert into deposit_queues(deposit_id, queue_id) values (p_ref, dest);
  else
    update deposit_queues set queue_id = dest, assigned_at = now() where deposit_id = p_ref;
  end if;
  return dest;
end; $$;

-- Trigger: al poner pendiente/on_hold, asignar cola
create or replace function public.trg_autotriage_deposit_fn() returns trigger language plpgsql as $$
begin
  if TG_OP='INSERT' or (TG_OP='UPDATE' and NEW.status <> OLD.status) then
    if NEW.status in ('pending','pending_second','on_hold') then
      perform public.autotriage_deposit(NEW.id);
    end if;
    if NEW.status in ('approved','rejected') then
      update deposit_queues set resolved_at = now() where deposit_id = NEW.id;
    end if;
  end if;
  return NEW;
end; $$;
drop trigger if exists trg_autotriage_deposit on public.bank_deposits;
create trigger trg_autotriage_deposit after insert or update on public.bank_deposits
for each row execute function public.trg_autotriage_deposit_fn();

-- Métricas por cola (pendientes, vencidos SLA, TTR promedio minutos)
create or replace function public.queue_metrics() returns table(
  queue_id uuid, name text, pending int, breached int, avg_ttr_mins numeric
) language sql stable as $$
  with pend as (
    select q.id, q.name, dq.assigned_at, q.sla_minutes, dq.resolved_at
    from queues q left join deposit_queues dq on dq.queue_id = q.id
    join bank_deposits d on d.id = dq.deposit_id
    where d.status in ('pending','pending_second','on_hold')
  )
  select p.id, p.name,
         count(*) filter (where p.resolved_at is null) as pending,
         count(*) filter (where p.resolved_at is null and now() > p.assigned_at + (p.sla_minutes||' minutes')::interval) as breached,
         avg( extract(epoch from (coalesce(p.resolved_at, now()) - p.assigned_at))/60.0 ) as avg_ttr_mins
  from pend p group by 1,2;
$$;
```

## UI — Dónde usarlo
- **Rules**: nuevo **constructor visual**; compila a JSON y pre‑llena el textarea para guardar.
- **Queues** (nueva pestaña): crea/edita colas, **métricas**, y reasigna depósitos.
- **Depósitos**: checkbox por fila + botones **Aprobar seleccionados / Rechazar seleccionados** con **Deshacer 10s** (snackbar).

