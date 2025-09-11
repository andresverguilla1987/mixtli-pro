const API_BASE = (localStorage.getItem('mixtli_api') || "https://mixtli-pro.onrender.com").replace(/\/$/,"");
const $ = (id)=>document.getElementById(id);
const statusEl = $("status");
const resultEl = $("result");
const debugEl = $("debug");

function logDebug(msg){
  console.log(msg);
  debugEl.textContent += msg + "\n";
}

function setStatus(t){ statusEl.textContent = t; }

async function doPresign(file){
  logDebug("Solicitando presign...");
  const r = await fetch(API_BASE + "/presign", {
    method:"POST",
    headers:{ "Content-Type":"application/json" },
    body: JSON.stringify({ filename:file.name, contentType:file.type, size:file.size })
  });
  logDebug("Respuesta presign: " + r.status);
  const txt = await r.text();
  logDebug("Cuerpo presign: " + txt);
  if(!r.ok) throw new Error("Presign fallo " + r.status);
  return JSON.parse(txt);
}

async function upload(file, presign){
  logDebug("Subiendo a R2: " + presign.url);
  const r = await fetch(presign.url, { method:"PUT", headers:{"Content-Type":file.type}, body:file });
  logDebug("PUT status: " + r.status + " " + r.statusText);
  if(!r.ok) throw new Error("PUT fallo " + r.status);
  return true;
}

function showPreview(url){
  resultEl.innerHTML = `✅ Enlace listo: <a href="${url}" target="_blank">${url}</a>`;
}

$("btnUpload").onclick = async ()=>{
  const f = $("file").files[0];
  if(!f) return alert("Selecciona un archivo");
  resultEl.textContent = "";
  debugEl.textContent = "";
  setStatus("presign...");
  try{
    const presign = await doPresign(f);
    setStatus("subiendo...");
    await upload(f, presign);
    const link = presign.publicUrl || "https://pub-f411a341ba7f44a28234293891897c59.r2.dev/" + encodeURIComponent(presign.key);
    showPreview(link);
    setStatus("listo ✅");
  }catch(e){
    setStatus("error ❌");
    logDebug("Error: " + e.message);
    alert(e.message);
  }
};

const drop = $("drop");
drop.addEventListener("click", ()=> $("file").click());
["dragenter","dragover"].forEach(ev=> drop.addEventListener(ev, e=>{ e.preventDefault(); drop.classList.add("drag") }));
["dragleave","drop"].forEach(ev=> drop.addEventListener(ev, e=>{ e.preventDefault(); drop.classList.remove("drag") }));
drop.addEventListener("drop", async e=>{
  e.preventDefault();
  const f = e.dataTransfer.files?.[0];
  if(!f) return;
  $("file").files = e.dataTransfer.files;
});
