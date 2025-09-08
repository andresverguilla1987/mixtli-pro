import { CFG } from './config.js';

const S = {
  tokenKey: 'mixtli.token',
  get token(){ return localStorage.getItem(this.tokenKey) || ''; },
  set token(v){ localStorage.setItem(this.tokenKey, v || ''); },
  base(path){ return `${CFG.API_BASE.replace(/\/$/,'')}${path}`; },
  authHeaders(extra={}){ return Object.assign({ 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + this.token }, extra); }
};

export async function health(){
  const r = await fetch(S.base('/api/health')); return r.json();
}
export async function register(email,password){
  const r = await fetch(S.base('/auth/register'), { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({email,password}) });
  const j = await r.json(); if(!r.ok) throw new Error(j.error||'register failed'); return j;
}
export async function login(email,password){
  const r = await fetch(S.base('/auth/login'), { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({email,password}) });
  const j = await r.json(); if(!r.ok) throw new Error(j.error||'login failed'); S.token = j.token; return j;
}
export async function presign(file, ttlDays=14){
  const r = await fetch(S.base('/upload/presign'), { method:'POST', headers: S.authHeaders(), body: JSON.stringify({ filename:file.name, size:file.size, mime:file.type||'application/octet-stream', ttlDays }) });
  const j = await r.json(); if(!r.ok) throw new Error(j.error||'presign failed'); return j;
}
export async function putToBucket(putUrl, file, onProgress){
  // Fetch no da progreso fiable. Usamos XHR por progreso.
  const etag = await new Promise((resolve, reject)=>{
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', putUrl, true);
    xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
    xhr.upload.onprogress = (ev)=>{ if(onProgress && ev.lengthComputable) onProgress(ev.loaded, ev.total); };
    xhr.onload = ()=>{
      if (xhr.status >= 200 && xhr.status < 300) {
        const e = xhr.getResponseHeader('ETag') || xhr.getResponseHeader('etag');
        resolve(e);
      } else reject(new Error('PUT failed '+xhr.status));
    };
    xhr.onerror = ()=> reject(new Error('PUT network error'));
    xhr.send(file);
  });
  return { etag };
}
export async function complete(uploadId, etag){
  const r = await fetch(S.base('/upload/complete'), { method:'POST', headers: S.authHeaders(), body: JSON.stringify({ uploadId, etag }) });
  const j = await r.json(); if(!r.ok) throw new Error(j.error||'complete failed'); return j;
}
export async function getLink(uploadId){
  const r = await fetch(S.base(`/upload/${uploadId}/link`), { headers: S.authHeaders() });
  const j = await r.json(); if(!r.ok) throw new Error(j.error||'link failed'); return j;
}
export async function sendEmail(uploadId, to, message){
  const r = await fetch(S.base('/email/send'), { method:'POST', headers: S.authHeaders(), body: JSON.stringify({ uploadId, to, message }) });
  const j = await r.json(); if(!r.ok) throw new Error(j.error||'email failed'); return j;
}
export const Token = S; // export para logout
