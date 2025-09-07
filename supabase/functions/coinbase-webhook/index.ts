// coinbase-webhook/index.ts — Coinbase Commerce webhook
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { crypto } from "https://deno.land/std@0.224.0/crypto/crypto.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const CC_SECRET = Deno.env.get("COINBASE_WEBHOOK_SECRET") || "";
const SKU_MAP_JSON = Deno.env.get("SKU_MAP_JSON") || "{}";
const SKU_MAP: Record<string, number> = JSON.parse(SKU_MAP_JSON);
const db = createClient(SUPABASE_URL, SERVICE_KEY);

async function verifyCoinbaseSig(body: string, sig: string){
  if (!CC_SECRET) return true;
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(CC_SECRET), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]
  );
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
  const hex = Array.from(new Uint8Array(mac)).map(b=>b.toString(16).padStart(2,"0")).join("");
  return hex === sig;
}

serve(async (req) => {
  const raw = await req.text();
  const sig = req.headers.get("X-CC-Webhook-Signature") || "";
  if (!(await verifyCoinbaseSig(raw, sig))) return new Response("bad sig", { status: 400 });
  const evt = JSON.parse(raw);
  const type = evt?.event?.type || "";
  if (!["charge:confirmed","charge:resolved"].includes(type)) return new Response("ok", { status: 200 });

  const data = evt?.event?.data || {};
  const metadata = data?.metadata || {};
  const user_id = metadata.user_id;
  const intent = metadata.intent || "gb_purchase";
  const sku = metadata.sku || "";
  const gb = SKU_MAP[sku] || Number(metadata.gb || 0);
  const amount = Math.round(Number(data?.pricing?.local?.amount || 0) * 100);
  const currency = (data?.pricing?.local?.currency || "USD").toLowerCase();
  const provider_ref = data?.id || evt?.event?.id;

  if (!user_id) return new Response("ok", { status: 200 });

  await db.from("profiles").upsert({ user_id }, { onConflict: "user_id" });

  if (intent === "wallet_topup"){
    await db.from("wallets").upsert({ user_id }, { onConflict: "user_id" });
    const { data: w } = await db.from("wallets").select("balance_cents").eq("user_id", user_id).single();
    const newBal = (w?.balance_cents||0) + (amount||0);
    await db.from("wallets").update({ balance_cents:newBal, updated_at: new Date().toISOString() }).eq("user_id", user_id);
    await db.from("wallet_ledger").insert({ user_id, type:"deposit", amount_cents:amount||0, currency, provider:"coinbase", provider_ref, description:"Depósito cripto" });
    await db.from("purchases").insert({ user_id, provider:"coinbase", provider_ref, price_id: sku||"wallet_topup", gb:0, amount_cents:amount||0, currency });
    return new Response("ok", { status: 200 });
  }

  if (!gb) return new Response("ok", { status: 200 });
  await db.from("purchases").insert({ user_id, provider:"coinbase", provider_ref, price_id: sku, gb, amount_cents: amount||0, currency });
  const { data: prof } = await db.from("profiles").select("bonus_gb").eq("user_id", user_id).single();
  const bonus = (prof?.bonus_gb || 0) + gb;
  await db.from("profiles").update({ bonus_gb: bonus, updated_at: new Date().toISOString() }).eq("user_id", user_id);
  return new Response("ok", { status: 200 });
});
