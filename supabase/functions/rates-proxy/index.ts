// rates-proxy/index.ts — obtiene precios de BTC, ETH, USDC
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const COINGECKO = Deno.env.get("COINGECKO_API_URL") || "https://api.coingecko.com/api/v3/simple/price";
const SUPPORTED = ["bitcoin","ethereum","usd-coin"];
const VS = ["usd","mxn","ars","brl","clp","cop","pen"];

async function fetchRates(){
  const ids = SUPPORTED.join(",");
  const vs = VS.join(",");
  const url = `${COINGECKO}?ids=${ids}&vs_currencies=${vs}`;
  const res = await fetch(url, { headers: { "accept": "application/json" } });
  if (!res.ok) throw new Error("bad rates");
  return res.json();
}

function calc(amountFiat: number, fiat: string, rates: any){
  const f = fiat.toLowerCase();
  const btc = rates.bitcoin?.[f] || rates.bitcoin?.usd;
  const eth = rates.ethereum?.[f] || rates.ethereum?.usd;
  const usdc = rates["usd-coin"]?.[f] || 1;
  return {
    BTC: btc ? amountFiat / btc : null,
    ETH: eth ? amountFiat / eth : null,
    USDC: usdc ? amountFiat / usdc : null
  };
}

serve(async (req) => {
  try{
    const { amount, currency } = await req.json();
    const rates = await fetchRates();
    const out = calc(Number(amount||0), (currency||"usd"), rates);
    return new Response(JSON.stringify({ ok:true, rates, out }), { headers: { "content-type":"application/json", "cache-control":"max-age=60" } });
  }catch(e){
    return new Response(JSON.stringify({ ok:false, error:String(e) }), { status: 200, headers: { "content-type":"application/json" } });
  }
});
