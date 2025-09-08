import { CFG } from './config.js';
import * as API from './adapter.js';

const $ = (q)=> document.querySelector(q);
const show = (el, yes)=> el.classList[yes? 'remove' : 'add']('hidden');

// Config init
$('#apiBase').value = CFG.API_BASE;
$('#driverHint').textContent = `Modo API · ${CFG.DRIVER_HINT}`;
if (!CFG.SHOW_REGISTER) {
  $('#btnTabReg').classList.add('hidden');
  $('#regBox').classList.add('hidden');
}

// Tabs auth
$('#btnTabLogin').onclick = ()=>{
  $('#btnTabLogin').classList.add('active');
  $('#btnTabReg').classList.remove('active');
  show($('#loginBox'), true); show($('#regBox'), false);
};
$('#btnTabReg').onclick = ()=>{
  $('#btnTabReg').classList.add('active');
  $('#btnTabLogin').classList.remove('active');
  show($('#loginBox'), false); show($('#regBox'), true);
};

// Save config + health
$('#btnSaveCfg').onclick = async ()=>{
  const base = $('#apiBase').value.trim();
  localStorage.setItem('mixtli.api', base);
  CFG.API_BASE = base;
  $('#healthText').textContent = 'probando...';
  try{
    const h = await API.health();
    $('#health').style.color = '#2ecc71';
    $('#healthText').textContent = `OK (${h.driver})`;
  }catch(e){
    $('#health').style.color = '#ff6b6b';
    $('#healthText').textContent = 'sin conexión';
  }
};

// Register
$('#btnRegister').onclick = async ()=>{
  $('#regOut').textContent = '...';
  try{
    const r = await API.register($('#regEmail').value.trim(), $('#regPass').value);
    $('#regOut').textContent = JSON.stringify(r, null, 2);
  }catch(e){ $('#regOut').textContent = e.message; }
};

// Login
$('#btnLogin').onclick = async ()=>{
  $('#logOut').textContent = '...';
  try{
    const r = await API.login($('#logEmail').value.trim(), $('#logPass').value);
    $('#logOut').textContent = 'OK';
    show($('#authCard'), false); show($('#appCard'), true);
    // Auto health to paint the tag
    $('#btnSaveCfg').click();
  }catch(e){ $('#logOut').textContent = e.message; }
};

// Logout
$('#btnLogout').onclick = ()=>{ API.Token.token = ''; show($('#appCard'), false); show($('#authCard'), true); };

// Upload flow (all-in-one)
$('#btnUpload').onclick = async ()=>{
  const f = $('#file').files[0];
  if (!f) return alert('Selecciona un archivo');
  show($('#progressWrap'), true);
  $('#statusText').textContent = 'Solicitando presign...';
  $('#sizeText').textContent = human(f.size);

  try{
    const ttl = Number($('#ttlDays').value || 14);
    const pre = await API.presign(f, ttl);

    $('#statusText').textContent = 'Subiendo al bucket...';
    const put = await API.putToBucket(pre.putUrl, f, (loaded, total)=>{
      const pct = total ? Math.round(loaded*100/total) : 0;
      $('#bar').style.width = pct+'%';
      $('#sizeText').textContent = `${human(loaded)} / ${human(total)}`;
    });

    $('#statusText').textContent = 'Confirmando...';
    await API.complete(pre.uploadId, put.etag);

    $('#statusText').textContent = 'Generando enlace...';
    const link = await API.getLink(pre.uploadId);

    $('#shareUrl').value = link.url;
    show($('#result'), true);
    $('#debug').textContent = JSON.stringify({ uploadId: pre.uploadId, etag: put.etag, link }, null, 2);

    // email opcional
    const to = $('#emailTo').value.trim();
    if (to) {
      await API.sendEmail(pre.uploadId, to, $('#emailMsg').value);
      $('#debug').textContent += '\n\nEmail enviado a ' + to;
    }

    $('#statusText').textContent = 'Listo ✔';
  }catch(e){
    $('#statusText').textContent = 'Error';
    $('#debug').textContent = e.message;
    $('#bar').style.width = '0%';
  }
};

$('#btnCopy').onclick = async ()=>{
  const v = $('#shareUrl').value;
  try { await navigator.clipboard.writeText(v); $('#btnCopy').textContent = 'Copiado'; setTimeout(()=> $('#btnCopy').textContent='Copiar', 1500); } catch {}
};

function human(n){
  const u = ['B','KB','MB','GB','TB']; let i=0; let x=n;
  while(x>=1024 && i<u.length-1){ x/=1024; i++; }
  return `${x.toFixed(1)} ${u[i]}`;
}

// Autocheck health on load
window.addEventListener('load', ()=> $('#btnSaveCfg').click());
