// wfm-scheduler/index.ts
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const db = createClient(SUPABASE_URL, SERVICE_KEY);

// simple helper
function hrsBetween(a: Date, b: Date){ return Math.max(0, (b.getTime()-a.getTime())/3600000); }

async function getEligibleAgents(queueId: string, requiredSkill: string|null, reqLvl: number){
  const { data: agents } = await db.rpc('eligible_agents_for_queue', { p_queue: queueId, p_skill: requiredSkill, p_level: reqLvl });
  return agents || [];
}

async function run(){
  // tomorrow 24h
  const now = new Date(); const day = new Date(now.getFullYear(), now.getMonth(), now.getDate()+1);
  const start = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 0,0,0);
  const end = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 23,59,59);

  const { data: fc } = await db.from('wfm_forecast').select('date_hour, queue_id, required_agents').gte('date_hour', start.toISOString()).lte('date_hour', end.toISOString());
  if (!fc?.length) return { scheduled: 0 };

  // Pre-cargar queue requirements
  const queues = Array.from(new Set(fc.map(x=>x.queue_id)));
  const { data: qrows } = await db.from('queues').select('id, required_skill, required_skill_level').in('id', queues);
  const qmap = new Map((qrows||[]).map((q:any)=>[q.id, q]));

  let scheduled = 0;
  for (const slot of fc){
    const qinfo = qmap.get(slot.queue_id) || {};
    const reqSkill = qinfo.required_skill || null;
    const reqLevel = qinfo.required_skill_level || 1;

    // agentes elegibles (RPC que respeta skills, on-call y carga)
    const { data: elig } = await db.rpc('eligible_agents_for_queue', { p_queue: slot.queue_id, p_skill: reqSkill, p_level: reqLevel });
    const pool = (elig||[]) as any[];

    // ya asignados a esa hora
    const { data: existing } = await db.from('wfm_roster').select('user_id').eq('queue_id', slot.queue_id).eq('date_hour', slot.date_hour);
    const taken = new Set((existing||[]).map((r:any)=>r.user_id));

    let need = Math.max(0, (slot.required_agents||0) - (existing?.length||0));
    for (const a of pool){
      if (need <= 0) break;
      if (taken.has(a.user_id)) continue;
      // constraints (max hours/day/week) simple check by counting roster rows
      const { data: usedDay } = await db.rpc('wfm_hours_for_user_day', { p_user: a.user_id, p_day: slot.date_hour });
      const { data: usedWeek } = await db.rpc('wfm_hours_for_user_week', { p_user: a.user_id, p_day: slot.date_hour });
      const maxDay = a.max_hours_day || 8; const maxWeek = a.max_hours_week || 40;
      if ((usedDay||0) >= maxDay || (usedWeek||0) >= maxWeek) continue;

      await db.from('wfm_roster').upsert({ date_hour: slot.date_hour, queue_id: slot.queue_id, user_id: a.user_id, assigned: true });
      need--; scheduled++;
    }
  }
  return { scheduled };
}

serve(async (_req)=>{
  try{
    const res = await run();
    return new Response(JSON.stringify({ ok:true, ...res }), { headers: { "content-type":"application/json" } });
  }catch(e){
    return new Response(JSON.stringify({ ok:false, error:String(e) }), { status:200 });
  }
});
