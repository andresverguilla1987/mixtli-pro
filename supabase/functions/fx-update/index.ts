// fx-update/index.ts — actualiza fx_rates
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const FX_API_URL = Deno.env.get("FX_API_URL") || "https://open.er-api.com/v6/latest/USD";
const FX_API_KEY = Deno.env.get("FX_API_KEY") || "";

const db = createClient(SUPABASE_URL, SERVICE_KEY);

const WANT = ["USD","EUR","MXN","BRL","ARS","COP","CLP","PEN","GTQ"];

async function fetchRates(){
  const headers: any = { "Content-Type":"application/json" };
  if (FX_API_KEY) headers["Authorization"] = `Bearer ${FX_API_KEY}`;
  const res = await fetch(FX_API_URL, { headers });
  const j = await res.json();
  // normaliza a un shape base
  // para open.er-api.com: j.rates = { MXN: 20.1, ... } con base USD
  let base = j?.base_code || j?.base || "USD";
  const rates = j?.rates || j?.data || {};
  return { base, rates };
}

serve(async (_req) => {
  try{
    const { base, rates } = await fetchRates();
    // Queremos rate_to_mxn: 1 CUR = X MXN
    const mxnPerBase = rates["MXN"] || rates["mxn"] || 1; // si base es USD: MXN por USD
    const ups: any[] = [];
    for (const c of WANT){
      let rate_to_mxn = 1;
      if (c.toUpperCase() === "MXN") rate_to_mxn = 1;
      else {
        // 1 CUR = (MXN per BASE) / (CUR per BASE)
        const curPerBase = rates[c] || rates[c.toLowerCase()];
        if (curPerBase && mxnPerBase){
          rate_to_mxn = Number(mxnPerBase) / Number(curPerBase);
        }
      }
      ups.push({ currency: c, rate_to_mxn, updated_at: new Date().toISOString() });
    }
    const { error } = await db.from("fx_rates").upsert(ups);
    if (error) throw error;
    return new Response(JSON.stringify({ ok:true, count: ups.length }), { headers: { "content-type":"application/json" } });
  }catch(e){
    return new Response(JSON.stringify({ ok:false, error: String(e) }), { status: 200 });
  }
});
