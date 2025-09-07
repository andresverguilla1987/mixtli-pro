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
