// create-crypto-charge/index.ts — crea checkout cripto (Coinbase Commerce / NOWPayments)
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const CC_BASE = Deno.env.get("COINBASE_API_BASE") || "https://api.commerce.coinbase.com";
const CC_KEY = Deno.env.get("COINBASE_API_KEY") || "";
const NP_BASE = Deno.env.get("NOWPAYMENTS_API_BASE") || "https://api.nowpayments.io/v1";
const NP_KEY = Deno.env.get("NOWPAYMENTS_API_KEY") || "";

async function coinbaseCreate(amount: number, currency: string, meta: Record<string,string>){
  const res = await fetch(`${CC_BASE}/charges`, {
    method: "POST",
    headers: { "Content-Type":"application/json", "X-CC-Api-Key": CC_KEY },
    body: JSON.stringify({
      name: "Mixtli — Recarga",
      description: "Recarga de saldo/GB",
      pricing_type: "fixed_price",
      local_price: { amount: amount.toFixed(2), currency: currency.toUpperCase() },
      metadata: meta
    })
  });
  const j = await res.json();
  return { url: j?.data?.hosted_url || "", id: j?.data?.id || "" };
}

async function nowpaymentsCreate(amount: number, currency: string, meta: Record<string,string>){
  const desc = `${meta.user_id}|${meta.sku||""}|${meta.intent||"wallet_topup"}`;
  const res = await fetch(`${NP_BASE}/invoice`, {
    method: "POST",
    headers: { "Content-Type":"application/json", "x-api-key": NP_KEY },
    body: JSON.stringify({
      price_amount: amount,
      price_currency: currency.toUpperCase(),
      order_description: desc,
      is_fee_paid_by_user: true
    })
  });
  const j = await res.json();
  return { url: j?.invoice_url || "", id: String(j?.id || "") };
}

serve(async (req) => {
  try{
    const { provider, amount, currency, user_id, sku, intent } = await req.json();
    if (!provider || !amount || !currency || !user_id) return new Response(JSON.stringify({ ok:false, error:"missing params" }), { status: 200 });
    const meta = { user_id, sku: sku||"", intent: intent||"wallet_topup" };
    let out = { url: "", id: "" };
    if (provider === "coinbase") out = await coinbaseCreate(Number(amount), String(currency), meta);
    else if (provider === "nowpayments") out = await nowpaymentsCreate(Number(amount), String(currency), meta);
    else return new Response(JSON.stringify({ ok:false, error:"unsupported provider" }), { status: 200 });
    return new Response(JSON.stringify({ ok:true, ...out }), { headers: { "content-type":"application/json" } });
  }catch(e){
    return new Response(JSON.stringify({ ok:false, error:String(e) }), { status: 200 });
  }
});
