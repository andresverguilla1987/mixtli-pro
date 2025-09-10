const $ = s => document.querySelector(s);
const apiInput = $("#apiBase");
const logEl = $("#log");
const LS_KEY = "mixtli_api_base";

function log(obj){ logEl.textContent = (typeof obj === "string") ? obj : JSON.stringify(obj,null,2); }
function apiBase(){ return (apiInput.value || "").trim().replace(/\/$/,""); }
function loadCfg(){ apiInput.value = localStorage.getItem(LS_KEY) || "https://mixtli-pro.onrender.com"; }
function saveCfg(){ localStorage.setItem(LS_KEY, apiInput.value.trim()); }

$("#saveCfg").onclick = ()=>{ saveCfg(); alert("Guardado"); };
$("#resetCfg").onclick = ()=>{ localStorage.removeItem(LS_KEY); loadCfg(); };

async function presignUpload(key, contentType){
  const r = await fetch(apiBase()+"/api/upload/presign", {
    method:"POST",
    headers:{ "Content-Type":"application/json" },
    body: JSON.stringify({ key, contentType })
  });
  if(!r.ok) throw new Error(await r.text());
  return r.json();
}

async function presignDownload(key, expiresIn=600){
  const r = await fetch(apiBase()+"/api/download/presign", {
    method:"POST",
    headers:{ "Content-Type":"application/json" },
    body: JSON.stringify({ key, expiresIn })
  });
  if(!r.ok) throw new Error(await r.text());
  return r.json();
}

$("#btnUpload").onclick = async () => {
  try{
    const f = $("#file").files[0];
    if(!f) return alert("Elige un archivo");
    const contentType = f.type || "application/octet-stream";
    const key = "u/demo/"+Date.now()+"-"+f.name;

    const up = await presignUpload(key, contentType);
    const put = await fetch(up.url, {
      method: up.method || "PUT",
      headers: up.headers || { "Content-Type": contentType },
      body: f,
      mode: "cors",
    });
    const txt = await put.text();
    if(!put.ok) throw new Error("PUT "+put.status+"\n"+txt);

    const dl = await presignDownload(key);
    log({ ok:true, key, putStatus: put.status, share: dl.url });
  }catch(e){
    log({ error: e.message });
    alert("Error de red en PUT (ver detalle abajo)");
  }
};

loadCfg();
