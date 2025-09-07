// nowpayments-webhook/index.ts — NOWPayments IPN
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { crypto } from "https://deno.land/std@0.224.0/crypto/crypto.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const IPN_SECRET = Deno.env.get("NOWPAYMENTS_IPN_SECRET") || "";
const SKU_MAP_JSON = Deno.env.get("SKU_MAP_JSON") || "{}";
const SKU_MAP: Record<string, number> = JSON.parse(SKU_MAP_JSON);
const db = createClient(SUPABASE_URL, SERVICE_KEY);

function verifySig(headers: Headers, body: string){
  if (!IPN_SECRET) return true;
  const sig = headers.get("x-nowpayments-sig") || "";
  // Según docs, comparar HMAC-SHA-256 del raw body con secret
  const key = IPN_SECRET;
  const enc = new TextEncoder();
  return crypto.subtle.importKey("raw", enc.encode(key), { name: "HMAC", hash: "SHA-256" }, false, ["sign","verify"])
    .then(k=> crypto.subtle.sign("HMAC", k, enc.encode(body)))
    .then(mac=> Array.from(new Uint8Array(mac)).map(b=>b.toString(16).padStart(2,"0")).join(""))
    .then(hex => hex === sig);
}

serve(async (req) => {
  const raw = await req.text();
  const ok = await verifySig(req.headers, raw);
  if (!ok) return new Response("bad sig", { status: 400 });
  const evt = JSON.parse(raw);
  const status = (evt.payment_status || "").toLowerCase();
  if (!["finished","confirmed","partially_paid"].includes(status)) return new Response("ok", { status: 200 });

  const user_id = evt.order_description?.split("|")[0]; // formato recomendado: "<user_id>|<sku>|<intent>"
  const sku = evt.order_description?.split("|")[1] || "";
  const intent = evt.order_description?.split("|")[2] || "gb_purchase";
  const amount = Math.round(Number(evt.price_amount || 0) * 100);
  const currency = (evt.price_currency || "USD").toLowerCase();
  const provider_ref = String(evt.payment_id || evt.invoice_id || Date.now());
  const gb = SKU_MAP[sku] || 0;

  if (!user_id) return new Response("ok", { status: 200 });
  await db.from("profiles").upsert({ user_id }, { onConflict: "user_id" });

  if (intent === "wallet_topup"){
    await db.from("wallets").upsert({ user_id }, { onConflict: "user_id" });
    const { data: w } = await db.from("wallets").select("balance_cents").eq("user_id", user_id).single();
    const newBal = (w?.balance_cents||0) + (amount||0);
    await db.from("wallets").update({ balance_cents:newBal, updated_at: new Date().toISOString() }).eq("user_id", user_id);
    await db.from("wallet_ledger").insert({ user_id, type:"deposit", amount_cents:amount||0, currency, provider:"nowpayments", provider_ref, description:"Depósito cripto" });
    await db.from("purchases").insert({ user_id, provider:"nowpayments", provider_ref, price_id: sku||"wallet_topup", gb:0, amount_cents:amount||0, currency });
    return new Response("ok", { status: 200 });
  }

  if (!gb) return new Response("ok", { status: 200 });
  await db.from("purchases").insert({ user_id, provider:"nowpayments", provider_ref, price_id: sku, gb, amount_cents: amount||0, currency });
  const { data: prof } = await db.from("profiles").select("bonus_gb").eq("user_id", user_id).single();
  const bonus = (prof?.bonus_gb || 0) + gb;
  await db.from("profiles").update({ bonus_gb: bonus, updated_at: new Date().toISOString() }).eq("user_id", user_id);
  return new Response("ok", { status: 200 });
});
