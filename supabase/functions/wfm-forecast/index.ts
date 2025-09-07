// wfm-forecast/index.ts
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const db = createClient(SUPABASE_URL, SERVICE_KEY);

function ceil(n:number){ return Math.ceil(n); }

async function run(){
  const { data: queues } = await db.from("queues").select("id,tenant_id").limit(5000);
  for (const q of queues || []){
    const { data: p } = await db.from("wfm_params").select("*").eq("tenant_id", q.tenant_id).eq("queue_id", q.id).maybeSingle();
    const aht = p?.aht_sec ?? 300;
    const occ = p?.occupancy ?? 0.85;
    const interval = p?.interval_min ?? 60;
    const now = new Date();
    for (let h=0; h<24; h++){
      const slot = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, 0, 0);
      const from = new Date(slot.getTime() - 28*86400000).toISOString();
      const to = slot.toISOString();
      const { data: hist } = await db
        .from("arrivals_hourly")
        .select("arrivals, date_hour")
        .eq("queue_id", q.id)
        .gte("date_hour", from)
        .lt("date_hour", to);
      const sample = (hist||[]).filter(r => new Date(r.date_hour as string).getHours() === h);
      const avgArrivals = sample.length ? Math.max(0, Math.round(sample.reduce((s:any,r:any)=>s+(r.arrivals||0),0)/sample.length)) : 0;
      const required = ceil((avgArrivals * aht) / (interval*60*occ || 1));
      await db.from("wfm_forecast").upsert({
        date_hour: slot.toISOString(),
        queue_id: q.id,
        arrivals: avgArrivals,
        aht_sec: aht,
        required_agents: required,
        sl: null,
        asa_sec: null
      });
    }
  }
}

serve(async (_req)=>{
  try{ await run(); return new Response(JSON.stringify({ ok:true }), { headers: { "content-type":"application/json" } }); }
  catch(e){ return new Response(JSON.stringify({ ok:false, error:String(e) }), { status:200 }); }
});
