// bq-export/index.ts
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { BigQuery } from "npm:@google-cloud/bigquery@7.11.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const GCP_PROJECT_ID = Deno.env.get("GCP_PROJECT_ID")!;
const BQ_DATASET = Deno.env.get("BQ_DATASET") || "mixtli";
const GOOGLE_APPLICATION_CREDENTIALS_JSON = Deno.env.get("GOOGLE_APPLICATION_CREDENTIALS_JSON")!;

const db = createClient(SUPABASE_URL, SERVICE_KEY);

function getBQ(){
  const creds = JSON.parse(GOOGLE_APPLICATION_CREDENTIALS_JSON);
  return new BigQuery({ projectId: GCP_PROJECT_ID, credentials: creds });
}

async function loadTable(bq: any, tableId: string, rows: any[]){
  if (!rows.length) return;
  const dataset = bq.dataset(BQ_DATASET);
  await dataset.get({ autoCreate: true });
  const table = dataset.table(tableId);
  try{ await table.get({ autoCreate: true }); }catch(_){}
  await table.insert(rows, { raw: true, skipInvalidRows: true, ignoreUnknownValues: true });
}

serve(async (req)=>{
  try{
    const { what } = await req.json();
    const bq = getBQ();

    if (!what || what === 'deposits' || what === 'all'){
      const { data: deps } = await db.rpc('bi_fact_deposits');
      await loadTable(bq, 'fact_deposits', deps||[]);
    }
    if (!what || what === 'purchases' || what === 'all'){
      const { data: pur } = await db.rpc('bi_fact_purchases');
      await loadTable(bq, 'fact_purchases', pur||[]);
    }
    return new Response(JSON.stringify({ ok:true }), { headers: { "content-type":"application/json" } });
  }catch(e){
    return new Response(JSON.stringify({ ok:false, error:String(e) }), { status:200 });
  }
});
