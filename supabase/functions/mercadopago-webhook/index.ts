// mercadopago-webhook/index.ts — Deno Edge Function de ejemplo
// deno run --allow-env --allow-net
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const MP_WEBHOOK_SECRET = Deno.env.get("MP_WEBHOOK_SECRET") || ""; // opcional: valida firma si configuras headers de firma
const SKU_MAP_JSON = Deno.env.get("SKU_MAP_JSON") || "{}"; // {"10GB":10, "50GB":50}
const SKU_MAP: Record<string, number> = JSON.parse(SKU_MAP_JSON);

const db = createClient(SUPABASE_URL, SERVICE_KEY);

serve(async (req) => {
  // Nota: MP envía POST con evento. Puedes validar cabeceras aquí si usas firma.
  try {
    const payload = await req.json();
    // Espera metadata en preference: { user_id, sku, price_id, currency, amount }
    const meta = payload?.data?.metadata || payload?.metadata || {};
    const user_id = meta.user_id;
    const sku: string = meta.sku || meta.price_id || "";
    const gb = SKU_MAP[sku] || Number(meta.gb || 0);
    const intent = meta.intent || 'gb_purchase';
    const provider_ref = String(payload?.data?.id || payload?.id || Date.now());
    const currency = meta.currency || payload?.data?.currency_id || "mxn";
    const amount = Number(meta.amount || payload?.data?.transaction_amount || 0) * 100; // cents

    if (!user_id) {
      console.log("Missing user_id or gb; skip");
      return new Response("ok", { status: 200 });
    }

    await db.from("profiles").upsert({ user_id }, { onConflict: "user_id" });

    if (intent === 'wallet_topup') {
      await db.from('wallets').upsert({ user_id }, { onConflict: 'user_id' });
      const { data: w } = await db.from('wallets').select('balance_cents').eq('user_id', user_id).single();
      const newBal = (w?.balance_cents||0) + (amount||0);
      await db.from('wallets').update({ balance_cents: newBal, updated_at: new Date().toISOString() }).eq('user_id', user_id);
      await db.from('wallet_ledger').insert({ user_id, type:'deposit', amount_cents:amount||0, currency, provider:'mercadopago', provider_ref, description:'Depósito a wallet' });
      await db.from('purchases').insert({ user_id, provider:'mercadopago', provider_ref, price_id: sku||'wallet_topup', gb: 0, amount_cents: amount||0, currency });
      return new Response('ok', { status: 200 });
    }
    await db.from("purchases").insert({ user_id, provider:"mercadopago", provider_ref, price_id: sku, gb, amount_cents: amount, currency });
    const { data: prof } = await db.from("profiles").select("bonus_gb").eq("user_id", user_id).single();
    const bonus = (prof?.bonus_gb || 0) + gb;
    await db.from("profiles").update({ bonus_gb: bonus, updated_at: new Date().toISOString() }).eq("user_id", user_id);

    return new Response("ok", { status: 200 });
  } catch (e) {
    return new Response("bad", { status: 200 });
  }
});
