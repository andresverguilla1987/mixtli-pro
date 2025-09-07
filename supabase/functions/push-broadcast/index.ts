// push-broadcast/index.ts
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY")!;
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY")!;
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") || "mailto:admin@example.com";

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
const db = createClient(SUPABASE_URL, SERVICE_KEY);

serve(async (req) => {
  try{
    const body = await req.json();
    const title = body?.title || "Mixtli";
    const text = body?.text || "Notificación";
    const tenant_id = body?.tenant_id || null;

    // destinatarios: admins o roles deposits; si tenant_id filtra por ese tenant
    // Por simplicidad, enviamos a todos los suscriptores (puedes restringir con joins a roles)
    let { data: subs } = await db.from('push_subscriptions').select('*').limit(10000);
    if (tenant_id) subs = (subs||[]).filter((s:any)=> s.tenant_id === tenant_id);

    const payload = JSON.stringify({ title, text, url: body?.url || '/admin.html?tab=deposits' });
    const toDelete: string[] = [];

    for (const s of (subs||[])){
      try{
        await webpush.sendNotification({
          endpoint: s.endpoint,
          keys: { p256dh: s.p256dh, auth: s.auth }
        }, payload);
      }catch(e){
        // 410/404 => eliminar
        toDelete.push(s.endpoint);
      }
    }

    if (toDelete.length){
      await db.from('push_subscriptions').delete().in('endpoint', toDelete);
    }

    return new Response(JSON.stringify({ ok:true, sent: (subs||[]).length, removed: toDelete.length }), { headers: { "content-type":"application/json" } });
  }catch(e){
    return new Response(JSON.stringify({ ok:false, error:String(e) }), { status:200 });
  }
});
