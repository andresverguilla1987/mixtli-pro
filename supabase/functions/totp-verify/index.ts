import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

// tiny TOTP utils
function base32toBytes(base32) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = '';
  let bytes = [];
  base32.replace(/=+$/, '').toUpperCase().split('').forEach(c => {
    const val = alphabet.indexOf(c);
    if (val < 0) return;
    bits += val.toString(2).padStart(5, '0');
  });
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.slice(i, i + 8), 2));
  }
  return new Uint8Array(bytes);
}
async function hmacSha1(keyBytes, msgBytes){
  const key = await crypto.subtle.importKey('raw', keyBytes, { name:'HMAC', hash:'SHA-1' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, msgBytes);
  return new Uint8Array(sig);
}
function counterToBytes(counter){
  const b = new Uint8Array(8);
  for (let i=7; i>=0; i--){ b[i] = counter & 0xff; counter = Math.floor(counter/256); }
  return b;
}
function truncate(h){
  const offset = h[h.length-1] & 0xf;
  const bin = ((h[offset] & 0x7f) << 24) | (h[offset+1] << 16) | (h[offset+2] << 8) | (h[offset+3]);
  return bin % 1000000;
}
async function totpNow(secretBase32, step=30){
  const key = base32toBytes(secretBase32);
  const ctr = Math.floor(Date.now()/1000/step);
  const msg = counterToBytes(ctr);
  const h = await hmacSha1(key, msg);
  const code = truncate(h).toString().padStart(6,'0');
  return code;
}
async function totpCheck(secretBase32, code, window=1, step=30){
  const key = base32toBytes(secretBase32);
  const now = Math.floor(Date.now()/1000/step);
  for (let w=-window; w<=window; w++){
    const msg = counterToBytes(now + w);
    const h = await hmacSha1(key, msg);
    const c = truncate(h).toString().padStart(6,'0');
    if (c === String(code).padStart(6,'0')) return true;
  }
  return false;
}
function randBase32(len=32){
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let s=''; for (let i=0;i<len;i++){ s+=alphabet[Math.floor(Math.random()*alphabet.length)]; }
  return s;
}

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const db = createClient(SUPABASE_URL, SERVICE_KEY);

serve(async (req) => {
  try{
    const { email, code } = await req.json();
    if (!email || !code) return new Response(JSON.stringify({ ok:false, error:"missing" }), { status:200 });
    const { data } = await db.from("admin_totp").select("secret_base32, enabled").eq("actor_email", email).single();
    if (!data || !data.enabled) return new Response(JSON.stringify({ ok:false, error:"not_enabled" }), { status:200 });
    const ok = await totpCheck(data.secret_base32, String(code));
    return new Response(JSON.stringify({ ok }), { headers: { "content-type":"application/json" } });
  }catch(e){
    return new Response(JSON.stringify({ ok:false, error:String(e) }), { status:200 });
  }
});
