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
