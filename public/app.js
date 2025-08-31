// v3: más funciones CRUD y utilidades
const $ = (s)=>document.querySelector(s);
const out = $("#result");
const yr = $("#yr"); if (yr) yr.textContent = new Date().getFullYear();
const toast = $("#toast");
const API = window.MIXTLI_API || window.location.origin;

$("#baseUrl") && ($("#baseUrl").textContent = API);

function showToast(msg){
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.remove('hidden');
  setTimeout(()=>toast.classList.add('show'), 10);
  setTimeout(()=>{ toast.classList.remove('show'); }, 1800);
}

function show(obj, ok=true){
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
    if (r.ok && r.data && r.data.id) { localStorage.setItem('mixtliUserId', r.data.id); showToast('Usuario demo creado: ID '+r.data.id); }
    else if (!r.ok && r.status===409) showToast('Email ya existe, vuelve a intentar');
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
  },
  async getById(){
    const id = Number(document.getElementById('uIdGet').value);
    if (!id) return showToast('Pon un ID válido');
    const r = await jfetch(API + '/api/users/'+id);
    show({ endpoint:'GET /api/users/'+id, status:r.status, data:r.data }, r.ok);
  },
  async putById(){
    const id = Number(document.getElementById('uIdPut').value);
    const email = document.getElementById('uEmailPut').value.trim();
    if (!id) return showToast('Pon un ID válido');
    if (!email) return showToast('Pon un email nuevo');
    const r = await jfetch(API + '/api/users/'+id, { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ email }) });
    show({ endpoint:'PUT /api/users/'+id, status:r.status, data:r.data }, r.ok);
    if (r.ok) showToast('Email actualizado');
  },
  async delById(){
    const id = Number(document.getElementById('uIdDel').value);
    if (!id) return showToast('Pon un ID válido');
    const r = await jfetch(API + '/api/users/'+id, { method:'DELETE' });
    show({ endpoint:'DELETE /api/users/'+id, status:r.status, data:r.data }, r.ok);
    if (r.ok) showToast('Usuario eliminado');
  }
};
window.Mixtli = Mixtli;

document.getElementById('btn-check')?.addEventListener('click', Mixtli.salud);
document.getElementById('btn-create')?.addEventListener('click', Mixtli.crear);
document.getElementById('btn-list')?.addEventListener('click', Mixtli.listar);
document.getElementById('btn-get-by-id')?.addEventListener('click', Mixtli.getById);
document.getElementById('btn-put-by-id')?.addEventListener('click', Mixtli.putById);
document.getElementById('btn-del-by-id')?.addEventListener('click', Mixtli.delById);

// curl copy
document.getElementById('btn-copy-curl')?.addEventListener('click', () => {
  const cmd = document.getElementById('curlCmd').textContent.replace('{{API}}', API).replace('&lt;ts&gt;', Date.now());
  navigator.clipboard.writeText(cmd).then(()=>showToast('cURL copiado'));
});

// Auto-ping en load
(async () => { try{ const r=await fetch(API + '/salud', {cache:'no-store'}); if(r.ok){ const d=document.getElementById('liveDot'); d&&d.classList.add('on'); const t=document.getElementById('liveText'); t&&(t.textContent='API online'); } }catch(e){} })();
