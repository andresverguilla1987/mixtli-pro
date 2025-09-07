// bq-cdc/index.ts
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { BigQuery } from "npm:@google-cloud/bigquery@7.11.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const GCP_PROJECT_ID = Deno.env.get("GCP_PROJECT_ID")!;
const BQ_DATASET = Deno.env.get("BQ_DATASET") || "mixtli";
const GOOGLE_APPLICATION_CREDENTIALS_JSON = Deno.env.get("GOOGLE_APPLICATION_CREDENTIALS_JSON")!;

const db = createClient(SUPABASE_URL, SERVICE_KEY);
function getBQ(){ const creds = JSON.parse(GOOGLE_APPLICATION_CREDENTIALS_JSON); return new BigQuery({ projectId: GCP_PROJECT_ID, credentials: creds }); }

async function upsertWatermark(entity: string, ts: string){
  await db.from('bi_export_watermarks').upsert({ entity, last_ts: ts });
}
async function getWatermark(entity: string){
  const { data } = await db.from('bi_export_watermarks').select('last_ts').eq('entity', entity).maybeSingle();
  return data?.last_ts || null;
}

serve(async (req)=>{
  try{
    const body = await req.json().catch(()=>({}));
    const what: string = body?.what || 'all';
    const bq = getBQ();
    const dataset = bq.dataset(BQ_DATASET); await dataset.get({ autoCreate:true });

    const exports: Array<'deposits'|'purchases'> = (what==='all') ? ['deposits','purchases'] : [what];
    for (const ent of exports){
      const wm = await getWatermark(ent);
      let query = ''; let tsField = 'created_at';
      if (ent === 'deposits'){
        query = 'select d.id, d.tenant_id, dq.queue_id, d.user_id, d.status, d.currency, d.expected_cents, coalesce(d.updated_at,d.created_at) as updated_at, d.created_at from bank_deposits d left join deposit_queues dq on dq.deposit_id=d.id';
        tsField = 'updated_at';
      }else{
        query = 'select id, tenant_id, user_id, provider, currency, amount_cents, coalesce(updated_at,created_at) as updated_at, created_at from purchases';
        tsField = 'updated_at';
      }
      if (wm){ query += ` where coalesce(${tsField}, created_at) > '${wm}'`; }
      const { data: rows, error } = await db.rpc('exec_sql_json', { p_sql: query });
      if (error) throw error;
      if (rows?.length){
        const table = dataset.table(ent === 'deposits' ? 'fact_deposits' : 'fact_purchases');
        try{ await table.get({ autoCreate:true }); }catch(_){}
        await table.insert(rows, { raw:true, skipInvalidRows: true, ignoreUnknownValues: true });
        const maxTs = rows.reduce((m:any,r:any)=> (m && m>r.updated_at) ? m : r.updated_at, null);
        if (maxTs) await upsertWatermark(ent, maxTs);
      }
    }

    return new Response(JSON.stringify({ ok:true }), { headers: { "content-type":"application/json" } });
  }catch(e){
    return new Response(JSON.stringify({ ok:false, error:String(e) }), { status:200 });
  }
});
