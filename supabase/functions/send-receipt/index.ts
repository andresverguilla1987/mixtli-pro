// send-receipt/index.ts — envía correo de recibo (Resend)
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const RESEND = Deno.env.get("RESEND_API_KEY") || "";

serve(async (req) => {
  try{
    const { to, subject, text, pdf_base64, filename } = await req.json();
    if (!RESEND) return new Response(JSON.stringify({ ok:false, error:"RESEND_API_KEY missing" }), { status: 200 });
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Authorization": `Bearer ${RESEND}`, "Content-Type":"application/json" },
      body: JSON.stringify({
        from: "Mixtli <receipts@mixtli.dev>",
        to: [to],
        subject: subject || "Tu recibo",
        text: text || "Gracias por tu pago.",
        attachments: pdf_base64 ? [{ filename: filename || 'comprobante.pdf', content: pdf_base64 }] : undefined
      })
    });
    const j = await res.json();
    return new Response(JSON.stringify({ ok:true, id: j?.id || "" }), { headers: { "content-type":"application/json" } });
  }catch(e){
    return new Response(JSON.stringify({ ok:false, error:String(e) }), { status: 200 });
  }
});
