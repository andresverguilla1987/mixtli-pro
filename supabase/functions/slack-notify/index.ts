// slack-notify/index.ts — envía mensajes a Slack
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const WEBHOOK = Deno.env.get("SLACK_WEBHOOK_URL") || "";

serve(async (req) => {
  try{
    const body = await req.json();
    if (!WEBHOOK) return new Response(JSON.stringify({ ok:false, error:"no webhook" }), { status: 200 });
    const text = body?.text || "Mixtli: notificación";
    const res = await fetch(WEBHOOK, {
      method: "POST",
      headers: { "Content-Type":"application/json" },
      body: JSON.stringify({ text })
    });
    return new Response(JSON.stringify({ ok: res.ok }), { headers: { "content-type":"application/json" } });
  }catch(e){
    return new Response(JSON.stringify({ ok:false, error:String(e) }), { status: 200 });
  }
});
