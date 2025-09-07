// audit-sign-kms/index.ts — firma con AWS KMS (RSA_SHA_256) y devuelve base64
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
// AWS SDK v3 con Deno compat
import { KMSClient, SignCommand } from "npm:@aws-sdk/client-kms@3.637.0";

const REGION = Deno.env.get("AWS_REGION") || "us-east-1";
const KMS_KEY_ID = Deno.env.get("KMS_KEY_ID") || "";
const AWS_ACCESS_KEY_ID = Deno.env.get("AWS_ACCESS_KEY_ID") || "";
const AWS_SECRET_ACCESS_KEY = Deno.env.get("AWS_SECRET_ACCESS_KEY") || "";
const AWS_SESSION_TOKEN = Deno.env.get("AWS_SESSION_TOKEN") || "";

const kms = new KMSClient({
  region: REGION,
  credentials: (AWS_ACCESS_KEY_ID && AWS_SECRET_ACCESS_KEY) ? {
    accessKeyId: AWS_ACCESS_KEY_ID,
    secretAccessKey: AWS_SECRET_ACCESS_KEY,
    sessionToken: AWS_SESSION_TOKEN || undefined
  } : undefined
});

function b64ToUint8(b64: string){
  const bin = atob(b64); const arr = new Uint8Array(bin.length);
  for (let i=0;i<bin.length;i++) arr[i]=bin.charCodeAt(i);
  return arr;
}
function uint8ToB64(u: Uint8Array){
  let s=''; for (let i=0;i<u.length;i++) s += String.fromCharCode(u[i]);
  return btoa(s);
}

serve(async (req) => {
  try{
    if (!KMS_KEY_ID) return new Response(JSON.stringify({ ok:false, error:"KMS_KEY_ID not set" }), { status:200 });
    const { b64, message } = await req.json();
    const bytes = b64 ? b64ToUint8(b64) : new TextEncoder().encode(String(message||''));
    const cmd = new SignCommand({
      KeyId: KMS_KEY_ID,
      Message: bytes,
      MessageType: "RAW",
      SigningAlgorithm: "RSASSA_PKCS1_V1_5_SHA_256"
    });
    const out = await kms.send(cmd);
    const sigB64 = uint8ToB64(new Uint8Array(out.Signature!));
    return new Response(JSON.stringify({ ok:true, sig: sigB64 }), { headers: { "content-type":"application/json" } });
  }catch(e){
    return new Response(JSON.stringify({ ok:false, error: String(e) }), { status:200 });
  }
});
