/* global window, localStorage, supabase */
(() => {
  const cfg = window.CONFIG || { mode: "demo" };
  const bucket = cfg.storageBucket || "files";
  let sb = null;

  if (cfg.mode === "supabase" && cfg.supabaseUrl && cfg.supabaseAnonKey && window.supabase) {
    sb = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey);
  }

  const userEmailEl = document.getElementById("userEmail");
  const logoutBtn = document.getElementById("logoutBtn");
  const uploadBtn = document.getElementById("uploadBtn");
  const uploadMsg = document.getElementById("uploadMsg");
  const fileList = document.getElementById("fileList");
  const fileGrid = document.getElementById("fileGrid");
  const statToday = document.getElementById("statToday");
  const statWeek = document.getElementById("statWeek");
  const statMonth = document.getElementById("statMonth");
  const listBtn = document.getElementById("listBtn");
  const gridBtn = document.getElementById("gridBtn");
  const searchInput = document.getElementById("searchInput");
  const typeFilter = document.getElementById("typeFilter");
  const sortBy = document.getElementById("sortBy");
  const sizeRange = document.getElementById("sizeRange");
  const selCount = document.getElementById("selCount");
  const bulkCopy = document.getElementById("bulkCopy");
  const bulkDelete = document.getElementById("bulkDelete");

  // Lightbox elements
  const lightbox = document.getElementById("lightbox");
  const stage = document.getElementById("lightboxStage");
  const caption = document.getElementById("lightboxCaption");
  const btnClose = document.getElementById("btnClose");
  const btnPrev = document.getElementById("btnPrev");
  const btnNext = document.getElementById("btnNext");
  const btnZoomIn = document.getElementById("btnZoomIn");
  const btnZoomOut = document.getElementById("btnZoomOut");
  const btnZoomReset = document.getElementById("btnZoomReset");
  const btnDownload = document.getElementById("btnDownload");
  const btnShare = document.getElementById("btnShare");

  let view = "grid"; // default
  let allItems = []; // {name,path,url,type,createdAt,size}
  let filteredIdx = []; // indices to show
  let selected = new Set(); // store paths
  let currentIndex = -1;
  let scale = 1, offsetX = 0, offsetY = 0;
  let dragging = false, lastX = 0, lastY = 0;

  function extOf(name) {
    const i = name.lastIndexOf(".");
    return i >= 0 ? name.substring(i+1).toLowerCase() : "";
  }
  function isImage(ext) { return ["png","jpg","jpeg","gif","webp","svg"].includes(ext); }
  function isVideo(ext) { return ["mp4","webm","ogg"].includes(ext); }
  function isPdf(ext) { return ext === "pdf"; }

  // UI toggles
  listBtn.addEventListener("click", () => { view = "list"; render(); });
  gridBtn.addEventListener("click", () => { view = "grid"; render(); });
  searchInput.addEventListener("input", render);
  typeFilter.addEventListener("change", render);
  sortBy.addEventListener("change", render);
  sizeRange.addEventListener("input", () => {
    document.documentElement.style.setProperty('--thumb-h', sizeRange.value + 'px');
  });

  function typeFromExt(ext) { return isImage(ext) ? "image" : isVideo(ext) ? "video" : isPdf(ext) ? "pdf" : "other"; }

  // Build UI elements
  function checkbox(el, path) {
    const cb = document.createElement("input");
    cb.type = "checkbox"; cb.className = "accent-brand-500";
    cb.checked = selected.has(path);
    cb.addEventListener("change", () => {
      if (cb.checked) selected.add(path); else selected.delete(path);
      selCount.textContent = String(selected.size);
    });
    el.prepend(cb);
  }

  function listRow(item, index) {
    const li = document.createElement("li");
    li.className = "rounded-md border border-white/10 bg-white/5 p-3 flex items-center justify-between gap-3";
    const left = document.createElement("div");
    left.className = "flex items-center gap-3 min-w-0";
    const titleBtn = document.createElement("button");
    titleBtn.className = "truncate text-left hover:underline"; titleBtn.textContent = item.name;
    titleBtn.addEventListener("click", () => openLightbox(index));

    left.appendChild(titleBtn);
    checkbox(left, item.path);

    const right = document.createElement("div");
    right.className = "flex items-center gap-2 text-xs text-slate-400";
    const sizeSpan = document.createElement("span"); sizeSpan.textContent = item.size? bytesToSize(item.size):"";
    const openA = document.createElement("a"); openA.className="px-2 py-1 rounded-md bg-white/10 hover:bg-white/20 text-slate-200"; openA.textContent="Abrir"; openA.href=item.url || "#"; openA.target="_blank";
    const copyB = document.createElement("button"); copyB.className="px-2 py-1 rounded-md bg-white/10 hover:bg-white/20 text-slate-200"; copyB.textContent="Copiar link";
    const delB = document.createElement("button"); delB.className="px-2 py-1 rounded-md bg-white/10 hover:bg-white/20 text-red-300"; delB.textContent="Borrar";

    copyB.addEventListener("click", async () => { try { await navigator.clipboard.writeText(item.url || item.path); toast("Link copiado."); } catch(e){ toast("No se pudo copiar"); } });
    delB.addEventListener("click", async () => { await deleteOne(item.path); });

    right.append(sizeSpan, openA, copyB, delB);
    li.append(left, right);
    return li;
  }

  function gridCard(item, index) {
    const card = document.createElement("div");
    card.className = "card rounded-lg border border-white/10 bg-white/5 p-3 space-y-2 group";
    const top = document.createElement("div"); top.className="flex items-center justify-between";
    const name = document.createElement("div"); name.className="truncate text-sm"; name.textContent = item.name;
    const badge = document.createElement("span"); badge.className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 border border-white/10 text-slate-300"; badge.textContent=item.type.toUpperCase();
    top.append(name, badge);

    const thumb = document.createElement("div");
    thumb.className = "thumb rounded-md overflow-hidden bg-black/30 cursor-zoom-in";
    const ext = extOf(item.name);
    if (isImage(ext)) { const img=document.createElement("img"); img.src=item.url||"#"; img.alt=item.name; thumb.appendChild(img); }
    else if (isVideo(ext)) { const v=document.createElement("video"); v.src=item.url||"#"; v.controls=false; v.preload="metadata"; v.muted=true; thumb.appendChild(v); }
    else if (isPdf(ext)) { const div=document.createElement("div"); div.className="w-full h-[var(--thumb-h)] grid place-items-center text-xs text-slate-300"; div.textContent="PDF"; thumb.appendChild(div); }
    else { const div=document.createElement("div"); div.className="w-full h-[var(--thumb-h)] grid place-items-center text-xs text-slate-300"; div.textContent=(ext||"FILE").toUpperCase(); thumb.appendChild(div); }

    thumb.addEventListener("click", () => openLightbox(index));

    const actions = document.createElement("div");
    actions.className = "flex items-center justify-between gap-2 text-xs text-slate-400";
    const left = document.createElement("div"); left.className="flex items-center gap-2";
    const sizeSpan = document.createElement("span"); sizeSpan.textContent = item.size? bytesToSize(item.size):"";
    left.append(sizeSpan);
    checkbox(left, item.path);

    const right = document.createElement("div"); right.className="flex items-center gap-2";
    const openA = document.createElement("a"); openA.className="px-2 py-1 rounded-md bg-white/10 hover:bg-white/20 text-slate-200"; openA.textContent="Abrir"; openA.href=item.url || "#"; openA.target="_blank";
    const copyB = document.createElement("button"); copyB.className="px-2 py-1 rounded-md bg-white/10 hover:bg-white/20 text-slate-200"; copyB.textContent="Copiar";
    const delB = document.createElement("button"); delB.className="px-2 py-1 rounded-md bg-white/10 hover:bg-white/20 text-red-300"; delB.textContent="Borrar";

    copyB.addEventListener("click", async () => { try { await navigator.clipboard.writeText(item.url || item.path); toast("Link copiado."); } catch(e){ toast("No se pudo copiar"); } });
    delB.addEventListener("click", async () => { await deleteOne(item.path); });

    right.append(openA, copyB, delB);
    actions.append(left, right);

    card.append(top, thumb, actions);
    return card;
  }

  function render() {
    // filter
    const q = (searchInput.value || "").toLowerCase().trim();
    const t = typeFilter.value;
    filteredIdx = [];
    for (let i=0;i<allItems.length;i++) {
      const it = allItems[i];
      if (t !== "all" && it.type !== t) continue;
      if (q && !it.name.toLowerCase().includes(q)) continue;
      filteredIdx.push(i);
    }
    // sort
    if (sortBy.value === "name") {
      filteredIdx.sort((a,b)=> allItems[a].name.localeCompare(allItems[b].name));
    } else { // recent
      filteredIdx.sort((a,b)=> new Date(allItems[b].createdAt || 0) - new Date(allItems[a].createdAt || 0));
    }

    fileList.innerHTML = "";
    fileGrid.innerHTML = "";
    if (view === "list") {
      fileList.classList.remove("hidden");
      fileGrid.classList.add("hidden");
      filteredIdx.forEach(idx => { fileList.appendChild(listRow(allItems[idx], idx)); });
    } else {
      fileList.classList.add("hidden");
      fileGrid.classList.remove("hidden");
      filteredIdx.forEach(idx => { fileGrid.appendChild(gridCard(allItems[idx], idx)); });
    }
    selCount.textContent = String(selected.size);
  }

  // Toast (simple)
  function toast(msg) {
    uploadMsg.textContent = msg;
    setTimeout(() => { if (uploadMsg.textContent === msg) uploadMsg.textContent = ""; }, 1800);
  }

  // Stats (simple demo)
  function updateStats() {
    const count = allItems.length;
    statToday.textContent = Math.min(3, count);
    statWeek.textContent = Math.min(12, count);
    statMonth.textContent = count;
  }

  async function getSession() {
    if (sb) {
      const { data } = await sb.auth.getUser();
      return data?.user || null;
    } else {
      const s = JSON.parse(localStorage.getItem("mx_session") || "null");
      return s ? { email: s.email, id: "demo-user" } : null;
    }
  }

  // Try to get content-length via HEAD on signed URL
  async function tryHeadSize(url) {
    try {
      const r = await fetch(url, { method: "HEAD" });
      const v = r.headers.get("content-length");
      return v ? parseInt(v,10) : null;
    } catch (e) { return null; }
  }

  function bytesToSize(bytes) {
    if (!bytes && bytes !== 0) return "";
    const units = ["B","KB","MB","GB"];
    let i = 0; let v = bytes;
    while (v >= 1024 && i < units.length-1) { v/=1024; i++; }
    return v.toFixed(1)+" "+units[i];
  }

  async function deleteOne(path) {
    if (!confirm("¿Borrar este archivo?")) return;
    if (sb) {
      const { error } = await sb.storage.from(bucket).remove([path]);
      if (error) { toast(error.message); return; }
    } else {
      const items = JSON.parse(localStorage.getItem("mx_files") || "[]").filter(it => it.path !== path);
      localStorage.setItem("mx_files", JSON.stringify(items));
    }
    selected.delete(path);
    allItems = allItems.filter(it => it.path !== path);
    render();
  }

  bulkCopy.addEventListener("click", async () => {
    if (!selected.size) { toast("No hay seleccionados"); return; }
    const lines = [];
    for (const path of selected) {
      const it = allItems.find(i => i.path === path);
      lines.push((it && it.url) ? it.url : path);
    }
    try { await navigator.clipboard.writeText(lines.join("\\n")); toast("Links copiados"); }
    catch(e){ toast("No se pudo copiar"); }
  });

  bulkDelete.addEventListener("click", async () => {
    if (!selected.size) { toast("No hay seleccionados"); return; }
    if (!confirm("¿Borrar seleccionados?")) return;
    for (const path of Array.from(selected)) {
      await deleteOne(path);
    }
    selected.clear();
    selCount.textContent = "0";
  });

  async function listFiles(uid) {
    allItems = [];
    selected.clear();
    selCount.textContent = "0";
    if (sb) {
      const { data, error } = await sb.storage.from(bucket).list(uid, { limit: 300, sortBy: { column: "created_at", order: "desc" } });
      if (error) { toast(error.message); return; }
      for (const item of data || []) {
        const path = `${uid}/${item.name}`;
        const ext = extOf(item.name);
        const type = typeFromExt(ext);
        let signedUrl = "";
        try { const r = await sb.storage.from(bucket).createSignedUrl(path, 3600); signedUrl = r.data?.signedUrl || ""; } catch(e){}
        const rec = { name: item.name, path, url: signedUrl, type, createdAt: item.created_at || item.updated_at || null, size: null };
        allItems.push(rec);
        // Try to fetch size async; update when available
        if (signedUrl) tryHeadSize(signedUrl).then(sz => { if (sz!=null){ rec.size = sz; if (view==="list"){ render(); } else { render(); } } });
      }
    } else {
      const items = JSON.parse(localStorage.getItem("mx_files") || "[]").reverse();
      for (const it of items) {
        const ext = extOf(it.name);
        allItems.push({ name: it.name, path: it.path, url: it.previewUrl || "#", type: typeFromExt(ext), createdAt: new Date(it.at||Date.now()).toISOString(), size: it.size || null });
      }
    }
    updateStats();
    render();
  }

  async function init() {
    const user = await getSession();
    if (!user) { window.location.href = "auth.html"; return; }
    userEmailEl.textContent = user.email || "";
    document.documentElement.style.setProperty('--thumb-h', sizeRange.value + 'px');
    await listFiles(user.id);
  }

  uploadBtn.addEventListener("click", async () => {
    const files = document.getElementById("fileInput").files;
    if (!files || !files.length) { toast("Selecciona archivos"); return; }
    const user = await getSession();
    if (!user) { window.location.href = "auth.html"; return; }
    for (const f of files) {
      uploadMsg.textContent = "Subiendo " + f.name + "...";
      const filename = `${Date.now()}_${f.name}`;
      const path = `${user.id}/${filename}`;
      try {
        if (sb) {
          const { error } = await sb.storage.from(bucket).upload(path, f, { upsert: true, cacheControl: "3600" });
          if (error) throw error;
        } else {
          const items = JSON.parse(localStorage.getItem("mx_files") || "[]");
          const previewUrl = URL.createObjectURL(f);
          items.push({ name: filename, size: f.size, path, previewUrl, at: Date.now() });
          localStorage.setItem("mx_files", JSON.stringify(items));
        }
      } catch (e) { toast(e.message || ("Error al subir "+f.name)); return; }
    }
    uploadMsg.textContent = "Subidas completadas ✔";
    const user2 = await getSession();
    await listFiles(user2.id);
  });

  logoutBtn.addEventListener("click", async () => {
    if (sb) await sb.auth.signOut();
    localStorage.removeItem("mx_session");
    window.location.href = "index.html";
  });

  // ---------- LIGHTBOX ----------
  function resetTransform() { scale = 1; offsetX = 0; offsetY = 0; }
  function setTransform(el) { el.style.transform = `translate(${offsetX}px, ${offsetY}px) scale(${scale})`; }

  function renderLightboxContent(item) {
    stage.innerHTML = "";
    const wrapper = document.createElement("div");
    wrapper.className = "max-w-[90vw] max-h-[80vh] overflow-hidden";
    const el = document.createElement(item.type === "video" ? "video" : (item.type === "pdf" ? "iframe" : "img"));
    el.draggable = false;
    if (item.type === "image") { el.src=item.url; el.alt=item.name; el.style.maxWidth="90vw"; el.style.maxHeight="80vh"; }
    else if (item.type === "video") { el.src=item.url; el.controls=true; el.style.maxWidth="90vw"; el.style.maxHeight="80vh"; }
    else if (item.type === "pdf") { el.src=item.url; el.style.width="90vw"; el.style.height="80vh"; }
    else { const div=document.createElement("div"); div.className="text-slate-200"; div.innerHTML=`<div class="text-center">No hay vista previa. <a class="underline" href="${item.url}" target="_blank">Abrir</a></div>`; wrapper.appendChild(div); stage.appendChild(wrapper); return; }
    el.style.transition="transform 0.05s linear"; el.style.transformOrigin="center center";
    wrapper.appendChild(el); stage.appendChild(wrapper);

    // Download/share targets
    btnDownload.href = item.url + (item.url.includes("?") ? "&" : "?") + "download=" + encodeURIComponent(item.name);
    btnShare.onclick = async () => { try { await navigator.clipboard.writeText(item.url); toast("Link copiado"); } catch(e){ toast("No se pudo copiar"); } };

    // wheel zoom
    stage.onwheel = (e) => { e.preventDefault(); const delta = e.deltaY > 0 ? -0.1 : 0.1; scale = Math.max(0.25, Math.min(6, scale + delta)); setTransform(el); };
    stage.onmousedown = (e) => { dragging = true; lastX = e.clientX; lastY = e.clientY; stage.style.cursor="grabbing"; };
    window.onmouseup = () => { dragging = False=false if False else false; stage.style.cursor="grab"; };
    window.onmousemove = (e) => { if (!dragging) return; offsetX += (e.clientX-lastX); offsetY += (e.clientY-lastY); lastX = e.clientX; lastY = e.clientY; setTransform(el); };
    stage.ondblclick = () => { resetTransform(); setTransform(el); };
  }

  function openLightbox(index) {
    currentIndex = index;
    resetTransform();
    const idx = filteredIdx.indexOf(index);
    const item = allItems[index];
    renderLightboxContent(item);
    caption.textContent = item.name + " (" + (idx+1) + "/" + filteredIdx.length + ")";
    lightbox.classList.remove("hidden"); document.body.classList.add("overflow-hidden");
  }
  function closeLightbox(){ lightbox.classList.add("hidden"); document.body.classList.remove("overflow-hidden"); stage.innerHTML=""; }
  function nextItem(){ if(!filteredIdx.length) return; const i = filteredIdx.indexOf(currentIndex); const ni = filteredIdx[(i+1)%filteredIdx.length]; openLightbox(ni); }
  function prevItem(){ if(!filteredIdx.length) return; const i = filteredIdx.indexOf(currentIndex); const pi = filteredIdx[(i-1+filteredIdx.length)%filteredIdx.length]; openLightbox(pi); }

  btnClose.addEventListener("click", closeLightbox);
  btnNext.addEventListener("click", nextItem);
  btnPrev.addEventListener("click", prevItem);
  btnZoomIn.addEventListener("click", () => { scale = Math.min(6, scale + 0.2); const el = stage.querySelector("img,video,iframe"); if (el) setTransform(el); });
  btnZoomOut.addEventListener("click", () => { scale = Math.max(0.25, scale - 0.2); const el = stage.querySelector("img,video,iframe"); if (el) setTransform(el); });
  btnZoomReset.addEventListener("click", () => { resetTransform(); const el = stage.querySelector("img,video,iframe"); if (el) setTransform(el); });

  window.addEventListener("keydown", (e) => {
    if (lightbox.classList.contains("hidden")) return;
    if (e.key === "Escape") closeLightbox();
    if (e.key === "ArrowRight") nextItem();
    if (e.key === "ArrowLeft") prevItem();
    if (e.key === "+" || e.key === "=") { scale = Math.min(6, scale + 0.2); const el = stage.querySelector("img,video,iframe"); if (el) setTransform(el); }
    if (e.key === "-" || e.key === "_") { scale = Math.max(0.25, scale - 0.2); const el = stage.querySelector("img,video,iframe"); if (el) setTransform(el); }
  });

  // init
  (async function init(){
    const user = await (sb ? (await sb.auth.getUser()).data.user : JSON.parse(localStorage.getItem("mx_session")||"null"));
    if (!user) { window.location.href="auth.html"; return; }
    userEmailEl.textContent = user.email || "";
    document.documentElement.style.setProperty('--thumb-h', sizeRange.value + 'px');
    const uid = user.id || "demo-user";
    await listFiles(uid);
  })();
})();