// btcpay-webhook/index.ts — BTCPay Server webhook
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SKU_MAP_JSON = Deno.env.get("SKU_MAP_JSON") || "{}";
const SKU_MAP: Record<string, number> = JSON.parse(SKU_MAP_JSON);
const db = createClient(SUPABASE_URL, SERVICE_KEY);

serve(async (req) => {
  const body = await req.json();
  const type = body?.type || "";
  if (type !== "InvoiceSettled") return new Response("ok", { status: 200 });

  const inv = body?.invoice || {};
  const meta = inv?.metadata || {}; // send metadata in invoice: { user_id, sku, intent }
  const user_id = meta.user_id;
  const sku = meta.sku || "";
  const intent = meta.intent || "gb_purchase";
  const amount = Math.round(Number(inv.price || 0) * 100);
  const currency = (inv.currency || "USD").toLowerCase();
  const provider_ref = String(inv.id || Date.now());
  const gb = SKU_MAP[sku] || 0;

  if (!user_id) return new Response("ok", { status: 200 });
  await db.from("profiles").upsert({ user_id }, { onConflict: "user_id" });

  if (intent === "wallet_topup"){
    await db.from("wallets").upsert({ user_id }, { onConflict: "user_id" });
    const { data: w } = await db.from("wallets").select("balance_cents").eq("user_id", user_id).single();
    const newBal = (w?.balance_cents||0) + (amount||0);
    await db.from("wallets").update({ balance_cents:newBal, updated_at: new Date().toISOString() }).eq("user_id", user_id);
    await db.from("wallet_ledger").insert({ user_id, type:"deposit", amount_cents:amount||0, currency, provider:"btcpay", provider_ref, description:"Depósito cripto" });
    await db.from("purchases").insert({ user_id, provider:"btcpay", provider_ref, price_id: sku||"wallet_topup", gb:0, amount_cents:amount||0, currency });
    return new Response("ok", { status: 200 });
  }

  if (!gb) return new Response("ok", { status: 200 });
  await db.from("purchases").insert({ user_id, provider:"btcpay", provider_ref, price_id: sku, gb, amount_cents: amount||0, currency });
  const { data: prof } = await db.from("profiles").select("bonus_gb").eq("user_id", user_id).single();
  const bonus = (prof?.bonus_gb || 0) + gb;
  await db.from("profiles").update({ bonus_gb: bonus, updated_at: new Date().toISOString() }).eq("user_id", user_id);
  return new Response("ok", { status: 200 });
});
