import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const db = createClient(SUPABASE_URL, SERVICE_KEY);

async function handle(job: any){
  try{
    if (job.topic === 'slack'){
      await fetch("/functions/v1/slack-notify", { method:"POST", body: JSON.stringify(job.payload) });
    }
    if (job.topic === 'discord'){
      await fetch("/functions/v1/discord-notify", { method:"POST", body: JSON.stringify(job.payload) });
    }
    if (job.topic === 'push'){
      await fetch('/functions/v1/push-broadcast', { method:'POST', body: JSON.stringify(job.payload) });
    }
    // Allow combined payloads with both fields
    if (job.payload?.discord_text){ await fetch('/functions/v1/discord-notify', { method:'POST', body: JSON.stringify({ text: job.payload.discord_text }) }); }
  }catch(e){}
}

serve(async (_req) => {
  try{
    const { data: jobs } = await db.from("jobs").select("*").eq("status","queued").lte("run_after", new Date().toISOString()).limit(20);
    for (const j of (jobs||[])){
      await db.from("jobs").update({ status: "running", attempts: (j.attempts||0)+1, updated_at: new Date().toISOString() }).eq("id", j.id);
      await handle(j);
      await db.from("jobs").update({ status: "done", updated_at: new Date().toISOString() }).eq("id", j.id);
    }
    return new Response(JSON.stringify({ ok:true, processed: (jobs||[]).length }), { headers: { "content-type":"application/json" } });
  }catch(e){
    return new Response(JSON.stringify({ ok:false, error:String(e) }), { status:200 });
  }
});
