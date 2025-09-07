// send-otp/index.ts — envía OTP al email y guarda hash
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND = Deno.env.get("RESEND_API_KEY") || "";

const db = createClient(SUPABASE_URL, SERVICE_KEY);

function code6(){
  return String(Math.floor(100000 + Math.random()*900000));
}
function sha256hex(str: string){
  const enc = new TextEncoder();
  // @ts-ignore
  return crypto.subtle.digest("SHA-256", enc.encode(str)).then(b => Array.from(new Uint8Array(b)).map(x=>x.toString(16).padStart(2,"0")).join(""));
}

serve(async (req) => {
  try{
    const { to } = await req.json();
    if (!to) return new Response(JSON.stringify({ ok:false, error:"missing to" }), { status: 200 });
    const code = code6();
    const hash = await sha256hex(code);
    const exp = new Date(Date.now() + 5*60*1000).toISOString();
    await db.from("admin_otps").insert({ actor_email: to, code_hash: hash, expires_at: exp });

    if (!RESEND) return new Response(JSON.stringify({ ok:true, debug_code: code }), { status: 200 });

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Authorization": `Bearer ${RESEND}`, "Content-Type":"application/json" },
      body: JSON.stringify({
        from: "Mixtli <security@mixtli.dev>",
        to: [to],
        subject: "Tu código OTP (Mixtli)",
        text: `Código: ${code}\nExpira en 5 minutos.`
      })
    });
    const j = await res.json();
    return new Response(JSON.stringify({ ok:true, id: j?.id||"" }), { headers: { "content-type":"application/json" } });
  }catch(e){
    return new Response(JSON.stringify({ ok:false, error:String(e) }), { status: 200 });
  }
});
