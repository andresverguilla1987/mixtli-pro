// paypal-webhook/index.ts — Deno Edge Function de ejemplo
// deno run --allow-env --allow-net
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const PAYPAL_WEBHOOK_ID = Deno.env.get("PAYPAL_WEBHOOK_ID") || "";
const SKU_MAP_JSON = Deno.env.get("SKU_MAP_JSON") || "{}"; // {"10GB":10, "50GB":50}
const SKU_MAP: Record<string, number> = JSON.parse(SKU_MAP_JSON);

const db = createClient(SUPABASE_URL, SERVICE_KEY);

serve(async (req) => {
  // Para producción valida firma de PayPal (transmission headers) contra PAYPAL_WEBHOOK_ID.
  // Aquí simplificamos y asumimos body confiable para demo.
  try {
    const body = await req.json();
    const eventType = body?.event_type || "";
    if (!eventType || !eventType.toLowerCase().includes("completed")) {
      return new Response("ok", { status: 200 });
    }
    // Extraer custom_id/sku del purchase_unit o resource
    const resource = body.resource || {};
    const amountObj = resource?.amount || resource?.seller_receivable_breakdown?.gross_amount || {};
    const currency = (amountObj.currency_code || "USD").toLowerCase();
    const amount = Math.round(Number(amountObj.value || 0) * 100);
    const custom = resource?.custom_id || resource?.invoice_id || "";
    // Se espera formato custom: "<user_id>|<sku>" o usar metadata en tu integración
    const [user_id, sku, intentRaw] = (custom || "").split("|");
    const intent = intentRaw || 'gb_purchase';
    const gb = SKU_MAP[sku||""] || 0;
    const provider_ref = String(resource?.id || body?.id || Date.now());

    if (!user_id) return new Response("ok", { status: 200 });

    await db.from("profiles").upsert({ user_id }, { onConflict: "user_id" });

    if (intent === 'wallet_topup') {
      await db.from('wallets').upsert({ user_id }, { onConflict: 'user_id' });
      const { data: w } = await db.from('wallets').select('balance_cents').eq('user_id', user_id).single();
      const newBal = (w?.balance_cents||0) + (amount||0);
      await db.from('wallets').update({ balance_cents: newBal, updated_at: new Date().toISOString() }).eq('user_id', user_id);
      await db.from('wallet_ledger').insert({ user_id, type:'deposit', amount_cents:amount||0, currency, provider:'paypal', provider_ref, description:'Depósito a wallet' });
      await db.from('purchases').insert({ user_id, provider:'paypal', provider_ref, price_id: sku||'wallet_topup', gb: 0, amount_cents: amount||0, currency });
      return new Response('ok', { status: 200 });
    }
    await db.from("purchases").insert({ user_id, provider:"paypal", provider_ref, price_id: sku, gb, amount_cents: amount, currency });
    const { data: prof } = await db.from("profiles").select("bonus_gb").eq("user_id", user_id).single();
    const bonus = (prof?.bonus_gb || 0) + gb;
    await db.from("profiles").update({ bonus_gb: bonus, updated_at: new Date().toISOString() }).eq("user_id", user_id);

    return new Response("ok", { status: 200 });
  } catch (e) {
    return new Response("ok", { status: 200 });
  }
});
