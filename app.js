(() => {
  const $ = s => document.querySelector(s);
  const logs = $("#logs");
  function log(...a){ try{ logs.textContent += a.map(x=>typeof x==='string'?x:JSON.stringify(x,null,2)).join(" ")+"\n"; logs.scrollTop=logs.scrollHeight; }catch{} }

  // Config
  const modeSel=$("#mode"), baseWrap=$("#baseWrap"), apiBaseInput=$("#apiBase"), cfgMsg=$("#cfgMsg");
  const infoOrigin=$("#infoOrigin"), infoBase=$("#infoBase"), infoEndpoints=$("#infoEndpoints");

  function getCfg(){ return { mode: localStorage.getItem("mode") || "proxy", base: localStorage.getItem("api_base") || "" }; }
  function setCfg({mode, base}){ if(mode) localStorage.setItem("mode", mode); if(base!==undefined) localStorage.setItem("api_base", base.trim()); cfgMsg.textContent="Guardado"; setTimeout(()=>cfgMsg.textContent="",1200); applyCfg(); }
  function applyCfg(){
    const {mode, base} = getCfg();
    modeSel.value = mode;
    baseWrap.style.display = (mode === "direct" ? "block" : "none");
    apiBaseInput.value = base;
    const origin = location.origin;
    const effectiveBase = (mode === "proxy" ? "" : (base || "").replace(/\/$/,""));
    infoOrigin.textContent = origin;
    infoBase.textContent = (mode === "proxy") ? "(proxy) relativo: "+origin+"/api/*" : (effectiveBase || "(no puesto)");
    infoEndpoints.textContent = (mode === "proxy") ? "/api/health , /api/presign" : `${effectiveBase||"(no puesto)"}/api/health , ${effectiveBase||"(no puesto)"}/api/presign`;
  }
  $("#saveCfg").onclick = ()=> setCfg({mode: modeSel.value, base: apiBaseInput.value});
  $("#resetCfg").onclick = ()=>{ localStorage.removeItem("mode"); localStorage.removeItem("api_base"); applyCfg(); };
  modeSel.onchange = applyCfg;
  applyCfg(); infoOrigin.textContent = location.origin;

  function baseUrl(){ const {mode, base} = getCfg(); return (mode === "proxy") ? "" : (base || "").replace(/\/$/,""); }
  function urlHealth(){ return baseUrl() + "/api/health"; }
  function urlPresignGET(filename, ct){ return baseUrl() + `/api/presign?filename=${encodeURIComponent(filename)}&contentType=${encodeURIComponent(ct)}`; }
  function urlPresignPOST(){ return baseUrl() + "/api/presign"; }

  async function fetchText(url, opts={}, timeoutMs=10000){
    const ctrl = new AbortController(); const t = setTimeout(()=>ctrl.abort("timeout"), timeoutMs);
    try{ const r=await fetch(url, { signal: ctrl.signal, ...opts }); const txt=await r.text(); return { ok:r.ok, status:r.status, text:txt, headers:r.headers }; }
    catch(e){ return { ok:false, status:0, text:String(e) }; }
    finally{ clearTimeout(t); }
  }
  $("#testHealth").onclick = async ()=>{ const url=urlHealth(); log("GET", url); const r=await fetchText(url); log("health:", r.status, r.text.slice(0,400)); cfgMsg.textContent = "Health "+r.status+(r.ok?" ✓":" ✗"); };
  $("#testPresign").onclick = async ()=>{ const url=urlPresignGET("ping.txt","text/plain"); log("GET", url); const r=await fetchText(url); log("presign:", r.status, r.text.slice(0,400)); cfgMsg.textContent = "Presign "+r.status+(r.ok?" ✓":" ✗"); };

  // Upload
  const drop=$("#drop"), fileEl=$("#file"), btnUpload=$("#btnUpload"), statusEl=$("#status"), bar=$("#bar"), pct=$("#pct"), speed=$("#speed"), eta=$("#eta");
  const publicUrl=$("#publicUrl"), openBtn=$("#open"), copyBtn=$("#copy"), img=$("#img");

  let file=null;
  function gotFile(f){ file=f; btnUpload.disabled=!file; statusEl.textContent = file ? `Archivo: ${file.name} (${Math.ceil(file.size/1024)} KB)` : ""; }
  fileEl.onchange = e => { if(e.target.files && e.target.files[0]) gotFile(e.target.files[0]); };
  ["dragenter","dragover"].forEach(evt => drop.addEventListener(evt, e=>{ e.preventDefault(); e.stopPropagation(); drop.classList.add("drag"); }));
  ["dragleave","drop"].forEach(evt => drop.addEventListener(evt, e=>{ e.preventDefault(); e.stopPropagation(); drop.classList.remove("drag"); }));
  drop.addEventListener("drop", e=>{ const f=e.dataTransfer.files&&e.dataTransfer.files[0]; if(f) gotFile(f); });

  function setResult(url){ publicUrl.value = url || ""; const isImg = url && /\.(png|jpg|jpeg|gif|webp|avif)$/i.test(url); img.style.display = isImg ? "block":"none"; if(isImg) img.src = url + (url.includes("?")?"&":"?") + "t=" + Date.now(); openBtn.disabled = !url; copyBtn.disabled = !url; }
  openBtn.onclick = ()=>{ if(publicUrl.value) window.open(publicUrl.value, "_blank"); };
  copyBtn.onclick = async ()=>{ if(publicUrl.value) try{ await navigator.clipboard.writeText(publicUrl.value); }catch{} };

  function putWithProgress(presign, file){
    return new Promise((resolve,reject)=>{
      const xhr = new XMLHttpRequest();
      xhr.open(presign.method || "PUT", presign.url, true);
      const headers = presign.headers || {}; Object.keys(headers).forEach(k => { try{ xhr.setRequestHeader(k, headers[k]); }catch{} });
      const start = Date.now();
      xhr.upload.onprogress = (e)=>{
        if(e.lengthComputable){
          const p = Math.round((e.loaded/e.total)*100); bar.style.width=p+"%"; pct.textContent=p+"%";
          const secs=(Date.now()-start)/1000, sp = secs>0 ? (e.loaded/1024/1024)/secs : 0; speed.textContent = sp.toFixed(2)+" MB/s";
          const rem=e.total-e.loaded, etaS=sp>0 ? (rem/1024/1024)/sp : 0; eta.textContent = "ETA "+(etaS>60?Math.round(etaS/60)+"m":Math.round(etaS)+"s");
        }
      };
      xhr.onload = ()=>{ const ok=xhr.status>=200&&xhr.status<300; ok?resolve():reject(new Error("PUT "+xhr.status)); };
      xhr.onerror = ()=> reject(new Error("Network/CORS PUT"));
      xhr.send(file);
    });
  }

  async function getPresignAuto(filename, contentType){
    const getURL = urlPresignGET(filename, contentType);
    log("GET", getURL);
    try{ const r1 = await fetch(getURL, { method:"GET" }); if(r1.ok){ return await r1.json(); } log("GET presign status", r1.status); } catch(e){ log("GET presign error", String(e)); }
    const postURL = urlPresignPOST(); log("POST", postURL);
    const r2 = await fetch(postURL, { method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify({ filename, contentType }) });
    if(!r2.ok){ const t=await r2.text(); log("POST presign body", t); throw new Error("presign "+r2.status); }
    return await r2.json();
  }

  $("#btnUpload").onclick = async ()=>{
    if(!file){ alert("Selecciona un archivo"); return; }
    bar.style.width="0%"; pct.textContent="0%"; speed.textContent="0 MB/s"; eta.textContent="ETA --s";
    statusEl.textContent = "Generando presign…";
    try{
      const presign = await getPresignAuto(file.name, file.type || "application/octet-stream");
      if(!presign || !presign.url) throw new Error("presign inválido");
      statusEl.textContent = "Subiendo…";
      await putWithProgress(presign, file);
      statusEl.textContent = "Subida completa ✓";
      const url = presign.publicUrl || (presign.publicBase && presign.key ? presign.publicBase.replace(/\/$/,"")+"/"+presign.key : "");
      setResult(url);
      log("publicUrl:", url || "(no provisto)");
    }catch(err){
      statusEl.textContent = "Error: " + (err.message || String(err));
      log("upload error:", err.message || String(err));
      alert("Falló presign/PUT: " + (err.message || String(err)) + "\\nSi los botones de arriba tampoco funcionan, revisa el proxy o el backend con los enlaces sin JS.");
    }
  };

  $("#clearLogs").onclick = ()=>{ logs.textContent=""; };
  log("origin:", location.origin);
})();