// Mixtli Front (Netlify-ready)
const DEFAULT_API_BASE = "https://mixtli-pro.onrender.com"; // Puedes cambiarlo si cambias de servicio

const els = {
  apiBase: document.getElementById('apiBase'),
  saveApiBase: document.getElementById('saveApiBase'),
  resetApiBase: document.getElementById('resetApiBase'),
  healthBadge: document.getElementById('healthBadge'),
  email: document.getElementById('email'),
  password: document.getElementById('password'),
  btnRegister: document.getElementById('btnRegister'),
  btnLogin: document.getElementById('btnLogin'),
  btnLogout: document.getElementById('btnLogout'),
  file: document.getElementById('file'),
  btnUpload: document.getElementById('btnUpload'),
  progress: document.getElementById('progress'),
  log: document.getElementById('log'),
  result: document.getElementById('result'),
  authMsg: document.getElementById('authMsg'),
};

function getApiBase(){ return localStorage.getItem('apiBase') || DEFAULT_API_BASE; }
function setApiBase(v){ localStorage.setItem('apiBase', v); els.apiBase.value = v; ping(); }
function token(){ return localStorage.getItem('token') || ''; }
function setToken(t){ localStorage.setItem('token', t); }
function log(msg){ els.log.textContent += (msg + "\n"); els.log.scrollTop = els.log.scrollHeight; }
function setProgress(p){ els.progress.style.width = `${Math.max(0, Math.min(100, p))}%`; }

async function ping(){
  els.healthBadge.textContent = 'Checking...';
  try{
    const res = await fetch(getApiBase() + '/api/health', {cache:'no-store'});
    if(!res.ok) throw new Error(res.statusText);
    const j = await res.json();
    els.healthBadge.textContent = `OK (${j.driver || 'driver?'})`;
  }catch(e){
    els.healthBadge.textContent = 'API OFF';
  }
}

function init(){
  els.apiBase.value = getApiBase();
  els.saveApiBase.onclick = ()=> setApiBase(els.apiBase.value.trim());
  els.resetApiBase.onclick = ()=> setApiBase(DEFAULT_API_BASE);

  els.btnRegister.onclick = async ()=>{
    try{
      const email = els.email.value.trim(), password = els.password.value;
      const r = await fetch(getApiBase() + '/auth/register', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ email, password })
      });
      const j = await r.json();
      if(!r.ok) throw new Error(j.error || 'Registro falló');
      els.authMsg.textContent = 'Registrado. Ahora inicia sesión.';
    }catch(e){ els.authMsg.textContent = e.message; }
  };

  els.btnLogin.onclick = async ()=>{
    try{
      const email = els.email.value.trim(), password = els.password.value;
      const r = await fetch(getApiBase() + '/auth/login', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ email, password })
      });
      const j = await r.json();
      if(!r.ok) throw new Error(j.error || 'Login falló');
      setToken(j.token);
      els.authMsg.textContent = 'Sesión iniciada.';
    }catch(e){ els.authMsg.textContent = e.message; }
  };

  els.btnLogout.onclick = ()=>{ localStorage.removeItem('token'); els.authMsg.textContent = 'Sesión cerrada.'; };

  els.btnUpload.onclick = async ()=>{
    const f = els.file.files[0];
    if(!f){ alert('Elige un archivo'); return; }
    const t = token(); if(!t){ alert('Primero inicia sesión'); return; }
    els.result.innerHTML = ''; setProgress(0); els.log.textContent = '';

    try{
      // 1) Presign
      const pres = await fetch(getApiBase() + '/upload/presign', {
        method:'POST',
        headers:{'Content-Type':'application/json','Authorization':'Bearer ' + t},
        body: JSON.stringify({ filename: f.name, size: f.size, mime: f.type || 'application/octet-stream' })
      });
      const j = await pres.json();
      if(!pres.ok) throw new Error(j.error || 'Presign falló');
      log('Presign OK');

      // 2) PUT a bucket (con progreso)
      await new Promise((resolve, reject)=>{
        const xhr = new XMLHttpRequest();
        xhr.open('PUT', j.putUrl, true);
        xhr.setRequestHeader('Content-Type', f.type || 'application/octet-stream');
        xhr.upload.onprogress = (e)=>{ if(e.lengthComputable){ setProgress(Math.round(e.loaded * 100 / e.total)); } };
        xhr.onload = ()=>{
          if(xhr.status >= 200 && xhr.status < 300) resolve(); else reject(new Error('PUT falló: ' + xhr.status));
        };
        xhr.onerror = ()=> reject(new Error('Error de red en PUT'));
        xhr.send(f);
      });
      log('PUT OK');

      // 3) Complete
      const etag = ''; // opcional: algunos providers devuelven ETag
      const comp = await fetch(getApiBase() + '/upload/complete', {
        method:'POST',
        headers:{'Content-Type':'application/json','Authorization':'Bearer ' + t},
        body: JSON.stringify({ uploadId: j.uploadId, etag })
      });
      const jc = await comp.json();
      if(!comp.ok) throw new Error(jc.error || 'Complete falló');
      log('Complete OK');

      // 4) Link
      const linkRes = await fetch(getApiBase() + '/upload/' + j.uploadId + '/link', {
        headers:{'Authorization':'Bearer ' + t}
      });
      const jl = await linkRes.json();
      if(!linkRes.ok || !jl.url) throw new Error(jl.error || 'No se pudo generar link');
      els.result.innerHTML = `<p>Listo: <a href="${jl.url}" target="_blank" rel="noopener">Descargar</a></p>`;
      log('Listo!');
    }catch(e){
      log('ERROR: ' + e.message);
      alert(e.message);
    }
  };

  ping();
}

document.addEventListener('DOMContentLoaded', init);
