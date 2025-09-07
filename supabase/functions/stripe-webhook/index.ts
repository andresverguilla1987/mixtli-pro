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
    const intent = session.metadata?.intent || 'gb_purchase';
    // Nota: con Payment Links puedes mapear por price_id vía SKU_MAP_JSON
    const price_id = session?.line_items?.data?.[0]?.price?.id || session?.display_items?.[0]?.price?.id || session?.metadata?.price_id;
    const gb = SKU_MAP[price_id] || Number(session.metadata?.gb || 0);
    const amount = session.amount_total ?? session.amount_subtotal ?? 0;
    const currency = session.currency || "mxn";
    const provider_ref = session.id;

    if (!user_id) {
      console.log("Missing user_id or gb; skipping.");
      return new Response("ok", { status: 200 });
    }

    await db.from("profiles").upsert({ user_id, email: session.customer_details?.email }, { onConflict: "user_id" });

    // Wallet topup vs GB purchase
    if (intent === 'wallet_topup') {
      const cents = session.amount_total ?? session.amount_subtotal ?? 0;
      // upsert wallet
      await db.from('wallets').upsert({ user_id }, { onConflict: 'user_id' });
      const { data: w } = await db.from('wallets').select('balance_cents').eq('user_id', user_id).single();
      const newBal = (w?.balance_cents||0) + (cents||0);
      await db.from('wallets').update({ balance_cents: newBal, updated_at: new Date().toISOString() }).eq('user_id', user_id);
      // ledger
      await db.from('wallet_ledger').insert({ user_id, type:'deposit', amount_cents:cents||0, currency: session.currency||'mxn', provider:'stripe', provider_ref: provider_ref, description:'Depósito a wallet' });
      // purchases record
      await db.from('purchases').insert({ user_id, provider:'stripe', provider_ref, price_id: price_id||'wallet_topup', gb: 0, amount_cents: cents||0, currency });
      return new Response('ok', { status: 200 });
    }
    await db.from("purchases").insert({
      user_id, provider: "stripe", provider_ref, price_id, gb, amount_cents: amount, currency
    });
    const { data: prof } = await db.from("profiles").select("bonus_gb").eq("user_id", user_id).single();
    const bonus = (prof?.bonus_gb || 0) + gb;
    await db.from("profiles").update({ bonus_gb: bonus, updated_at: new Date().toISOString() }).eq("user_id", user_id);
  }

  return new Response("ok", { status: 200 });
});
