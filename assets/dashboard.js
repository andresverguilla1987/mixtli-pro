/* Dashboard V6: uso de cuota + bloqueo de subida + lista simple */
(() => {
  const cfg = window.CONFIG || { mode: "demo" };
  const bucket = cfg.storageBucket || "files";
  let sb = null;
  if (cfg.mode === "supabase" && cfg.supabaseUrl && cfg.supabaseAnonKey && window.supabase) {
    sb = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey);
  }

  const fileInput = document.getElementById("fileInput");
  const uploadBtn = document.getElementById("uploadBtn");
  const uploadMsg = document.getElementById("uploadMsg");
  const fileGrid = document.getElementById("fileGrid");
  const userEmailEl = document.getElementById("userEmail");
  const usageBar = document.getElementById("usageBar");
  const usageLabel = document.getElementById("usageLabel");
  const logoutBtn = document.getElementById("logoutBtn");

  function toast(m){ uploadMsg.textContent=m; setTimeout(()=>{ if(uploadMsg.textContent===m) uploadMsg.textContent=""; },1800); }
  function bytesToSize(bytes){ if (!bytes&&bytes!==0) return "0 B"; const u=["B","KB","MB","GB"]; let i=0,v=bytes; while(v>=1024&&i<u.length-1){v/=1024;i++;} return v.toFixed(1)+" "+u[i]; }
  const GB = 1024*1024*1024;

  async function getSession(){
    if (sb){ const { data } = await sb.auth.getUser(); return data?.user || null; }
    const s = JSON.parse(localStorage.getItem("mx_session") || "null");
    return s ? { email:s.email, id:"demo-user" } : null;
  }

  async function ensureProfile(user){
    if (sb){
      const { data } = await sb.from("profiles").select("*").eq("user_id", user.id).maybeSingle();
      if (!data){
        await sb.from("profiles").insert({ user_id:user.id, email:user.email });
        return { quota_gb:2, bonus_gb:0, used_bytes:0 };
      }
      return data;
    } else {
      const prof = JSON.parse(localStorage.getItem("mx_profile") || "null");
      if (!prof){ const p={ quota_gb:2, bonus_gb:0, used_bytes:0 }; localStorage.setItem("mx_profile", JSON.stringify(p)); return p; }
      return prof;
    }
  }

  async function getUsedBytes(user){
    if (sb){
      const { data } = await sb.from("file_index").select("size_bytes").eq("user_id", user.id);
      let sum=0; (data||[]).forEach(r=> sum += (r.size_bytes||0)); return sum;
    } else {
      const items = JSON.parse(localStorage.getItem("mx_files")||"[]");
      let sum=0; items.forEach(i=> sum += (i.size||0)); return sum;
    }
  }

  function renderUsage(profile, used){
    const totalGB = (profile.quota_gb||0) + (profile.bonus_gb||0);
    const totalBytes = totalGB * GB;
    const pct = totalBytes>0 ? Math.min(100, Math.round(used*100/totalBytes)) : 0;
    usageBar.style.width = pct + "%";
    usageBar.style.background = pct>=100? "#ef4444" : (pct>=80? "#f59e0b" : "#22c55e");
    usageLabel.textContent = `${(used/GB).toFixed(2)} / ${totalGB} GB`;
    return { pct, totalBytes };
  }

  async function listFiles(user){
    fileGrid.innerHTML="";
    if (sb){
      const { data, error } = await sb.storage.from(bucket).list(user.id, { limit: 1000, sortBy:{column:"created_at",order:"desc"} });
      if (error){ toast(error.message); return; }
      for (const item of data||[]){
        const path = `${user.id}/${item.name}`;
        const row=document.createElement("div"); row.className="rounded-lg border border-white/10 bg-white/5 p-3 text-sm flex items-center justify-between gap-2";
        row.innerHTML = `<div class="truncate">${item.name}</div><a class="px-2 py-1 rounded-md bg-white/10 hover:bg-white/20" target="_blank">Abrir</a>`;
        try { const r = await sb.storage.from(bucket).createSignedUrl(path, 3600); row.querySelector("a").href = r.data?.signedUrl || "#"; } catch(e){}
        fileGrid.appendChild(row);
      }
    } else {
      const items = JSON.parse(localStorage.getItem("mx_files")||"[]").slice(-50).reverse();
      for (const it of items){
        const row=document.createElement("div"); row.className="rounded-lg border border-white/10 bg-white/5 p-3 text-sm flex items-center justify-between gap-2";
        row.innerHTML = `<div class="truncate">${it.name}</div><a class="px-2 py-1 rounded-md bg-white/10 hover:bg-white/20" target="_blank">Abrir</a>`;
        if (it.dataUrl){
          (async ()=>{ const res = await fetch(it.dataUrl); const blob = await res.blob(); const u = URL.createObjectURL(blob); row.querySelector("a").href = u; })();
        } else {
          row.querySelector("a").href = it.previewUrl || "#";
        }
        fileGrid.appendChild(row);
      }
    }
  }

  uploadBtn.addEventListener("click", async ()=>{
    const files = fileInput.files;
    if (!files || !files.length){ toast("Selecciona archivos"); return; }
    const user = await getSession(); if (!user){ window.location.href="auth.html"; return; }

    const prof = await ensureProfile(user);
    const used = await getUsedBytes(user);
    const { totalBytes } = renderUsage(prof, used);
    let incoming = 0; for (const f of files) incoming += f.size;
    if (totalBytes === 0 || used + incoming > totalBytes){
      toast("🚫 Te pasas de tu cuota. Compra GB en 'Planes y Recargas'.");
      return;
    }

    for (const f of files){
      const filename = `${Date.now()}_${f.name}`;
      const path = `${user.id}/${filename}`;
      if (sb){
        const { error } = await sb.storage.from(bucket).upload(path, f, { upsert: true, cacheControl: "3600" });
        if (error){ toast(error.message); return; }
        await sb.from("file_index").upsert({ user_id:user.id, path, size_bytes:f.size });
      } else {
        const items = JSON.parse(localStorage.getItem("mx_files")||"[]");
        const fr = new FileReader();
        await new Promise((res, rej)=>{ fr.onload=()=>res(None); fr.onerror=rej; fr.readAsDataURL(f); });
        items.push({ name: filename, size: f.size, path, dataUrl: fr.result, at: Date.now() });
        localStorage.setItem("mx_files", JSON.stringify(items));
        const prof2 = JSON.parse(localStorage.getItem("mx_profile")||'{"quota_gb":2,"bonus_gb":0,"used_bytes":0}');
        prof2.used_bytes = (prof2.used_bytes||0) + f.size;
        localStorage.setItem("mx_profile", JSON.stringify(prof2));
      }
    }
    toast("Subidas ✔");
    await refreshUsage();
    await listFiles(user);
  });

  async function refreshUsage(){
    const user = await getSession();
    if (!user){ window.location.href="auth.html"; return; }
    userEmailEl.textContent = user.email || "";
    const prof = await ensureProfile(user);
    const used = await getUsedBytes(user);
    renderUsage(prof, used);
  }

  logoutBtn.addEventListener("click", async ()=>{ if (sb) await sb.auth.signOut(); localStorage.removeItem("mx_session"); window.location.href = "index.html"; });

  (async function init(){
    await refreshUsage();
    const user = await getSession(); if (!user) return;
    await listFiles(user);
  })();
})();