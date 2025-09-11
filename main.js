// ===== Config =====
const API_BASE = (localStorage.getItem('mixtli_api') || new URLSearchParams(location.search).get('api') || "https://mixtli-pro.onrender.com").replace(/\/$/,"");

document.addEventListener('DOMContentLoaded', ()=>{
  const apiLabel = document.getElementById('apiLabel'); if(apiLabel) apiLabel.textContent = "API: " + API_BASE;
  document.getElementById('year').textContent = new Date().getFullYear();
  document.getElementById('origin').textContent = window.location.origin;
  document.getElementById('btnSetApi').onclick = ()=>{
    const v = prompt("API Base:", API_BASE);
    if(v){ localStorage.setItem('mixtli_api', v); location.reload(); }
  }
});

// ===== Helpers de UI =====
const $ = (id) => document.getElementById(id);
const statusEl = $("status");
const listEl = $("list");
const resultEl = $("result");

function setStatus(t){ statusEl.textContent = t }
function toastOK(text, url){
  const id = "f" + Math.random().toString(36).slice(2,8);
  const row = document.createElement("div");
  row.className = "file-row";
  row.innerHTML = \`
    <span class="name">\${text}</span>
    <a class="pill" href="\${url}" target="_blank" rel="noopener">Abrir</a>
    <button class="btn ghost" id="\${id}">Copiar</button>
  \`;
  listEl.prepend(row);
  document.getElementById(id).onclick = async ()=>{ await navigator.clipboard.writeText(url); alert("URL copiada"); };
}
function showPreview(url){
  resultEl.innerHTML = \`
    <div style="margin:8px 0">
      ✅ Enlace listo: <a href="\${url}" target="_blank" rel="noopener">\${url}</a>
      <button id="copyNow" class="btn ghost" style="margin-left:8px">Copiar</button>
    </div>
    <div class="preview"><img src="\${url}" alt="preview"/></div>
  \`;
  $("copyNow").onclick = async ()=>{ await navigator.clipboard.writeText(url); alert("URL copiada"); };
}

// ===== Upload =====
async function doPresign(file){
  const r = await fetch(API_BASE + "/presign", {
    method:"POST",
    headers:{ "Content-Type":"application/json" },
    body: JSON.stringify({ filename:file.name, contentType:file.type, size:file.size })
  });
  if(!r.ok){ throw new Error("Presign " + r.status + " " + await r.text()) }
  return r.json();
}
async function upload(file, presign){
  const r = await fetch(presign.url, { method:"PUT", headers:{"Content-Type":file.type}, body:file });
  if(!r.ok){ throw new Error("PUT " + r.status + " " + r.statusText) }
  return true;
}

const drop = $("drop");
drop.addEventListener("click", ()=> $("file").click());
["dragenter","dragover"].forEach(ev=> drop.addEventListener(ev, e=>{ e.preventDefault(); drop.classList.add("drag") }));
["dragleave","drop"].forEach(ev=> drop.addEventListener(ev, e=>{ e.preventDefault(); drop.classList.remove("drag") }));
drop.addEventListener("drop", async e=>{
  const f = e.dataTransfer.files?.[0]; if(!f) return;
  $("file").files = e.dataTransfer.files;
  await startUpload(f);
});

$("btnUpload").onclick = async ()=>{
  const f = $("file").files[0];
  if(!f) return alert("Selecciona un archivo");
  await startUpload(f);
};

async function startUpload(file){
  resultEl.innerHTML = "";
  setStatus("presign...");
  try{
    const presign = await doPresign(file);
    setStatus("subiendo...");
    await upload(file, presign);
    const link = presign.publicUrl || "https://pub-f411a341ba7f44a28234293891897c59.r2.dev/" + encodeURIComponent(presign.key);
    showPreview(link);
    toastOK(file.name, link);
    setStatus("listo ✅");
  }catch(e){
    setStatus("error ❌");
    alert(e.message);
  }
}
