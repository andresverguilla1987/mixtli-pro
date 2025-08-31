// App JS — pega a la API real y muestra resultados
const $ = (s)=>document.querySelector(s);
const out = $("#result");
const yr = $("#yr"); if (yr) yr.textContent = new Date().getFullYear();
const API = window.MIXTLI_API || window.location.origin;

function show(obj, ok=true){
  if(!out) return;
  out.classList.remove('hidden');
  out.innerHTML = '<div class="badge '+(ok?'ok':'err')+'">'+(ok?'OK':'ERROR')+'</div>';
  out.innerHTML += '<pre>'+JSON.stringify(obj,null,2)+'</pre>';
}

async function jfetch(url, opts) {
  const res = await fetch(url, opts);
  const text = await res.text();
  try{ const data = text ? JSON.parse(text) : {}; return { ok: res.ok, status: res.status, data }; }
  catch(e){ return { ok: res.ok, status: res.status, data: { raw: text } }; }
}

const Mixtli = {
  async salud(){
    const r = await jfetch(API + '/salud');
    show({ endpoint:'/salud', status:r.status, data:r.data }, r.ok);
    if (r.ok) { const dot=document.getElementById('liveDot'); if(dot) dot.classList.add('on'); const t=document.getElementById('liveText'); if(t) t.textContent='API online'; }
  },
  async crear(){
    const unique = Date.now();
    const body = { email: 'inversionista+'+unique+'@mixtli.com', password: '123456' };
    const r = await jfetch(API + '/api/users', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) });
    show({ endpoint:'POST /api/users', status:r.status, data:r.data }, r.ok);
    if (r.ok && r.data && r.data.id) localStorage.setItem('mixtliUserId', r.data.id);
  },
  async listar(){
    const r = await jfetch(API + '/api/users');
    if (r.ok && Array.isArray(r.data)){
      out.classList.remove('hidden');
      const rows = r.data.slice(-10).reverse().map(u => `<tr><td>${u.id}</td><td>${u.correo}</td><td>${new Date(u.createdAt).toLocaleString()}</td></tr>`).join('');
      out.innerHTML = `<div class="badge ok">OK</div><pre>{"endpoint":"GET /api/users","status":${r.status},"count":${r.data.length}}</pre>
      <table><thead><tr><th>ID</th><th>Correo</th><th>Creado</th></tr></thead><tbody>${rows}</tbody></table>`;
    } else {
      show({ endpoint:'GET /api/users', status:r.status, data:r.data }, r.ok);
    }
  }
};
window.Mixtli = Mixtli;

document.getElementById('btn-check')?.addEventListener('click', Mixtli.salud);
document.getElementById('btn-create')?.addEventListener('click', Mixtli.crear);
document.getElementById('btn-list')?.addEventListener('click', Mixtli.listar);

// Auto-ping en load para mostrar LIVE
(async () => { try{ const r=await fetch(API + '/salud', {cache:'no-store'}); if(r.ok){ const d=document.getElementById('liveDot'); d&&d.classList.add('on'); const t=document.getElementById('liveText'); t&&(t.textContent='API online'); } }catch(e){} })();
