// push-register/index.ts
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const db = createClient(SUPABASE_URL, SERVICE_KEY);

serve(async (req) => {
  try{
    const { user_id, email, subscription, tenant_id } = await req.json();
    if (!subscription?.endpoint) return new Response(JSON.stringify({ ok:false, error:'no subscription' }), { status:200 });
    const rec = {
      user_id: user_id || null,
      email: email || null,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys?.p256dh || '',
      auth: subscription.keys?.auth || '',
      tenant_id: tenant_id || null
    };
    const { error } = await db.from('push_subscriptions').upsert(rec, { onConflict: 'endpoint' });
    if (error) throw error;
    return new Response(JSON.stringify({ ok:true }), { headers: { "content-type":"application/json" } });
  }catch(e){
    return new Response(JSON.stringify({ ok:false, error:String(e) }), { status:200 });
  }
});
