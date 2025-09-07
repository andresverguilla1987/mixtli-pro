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

  let view = "grid"; // default
  let itemsCache = []; // {name, path, url, type}
  let currentIndex = -1;
  let scale = 1, offsetX = 0, offsetY = 0;
  let dragging = false, lastX = 0, lastY = 0;

  listBtn.addEventListener("click", () => { view = "list"; renderLayout(); });
  gridBtn.addEventListener("click", () => { view = "grid"; renderLayout(); });

  function renderLayout() {
    fileList.classList.toggle("hidden", view !== "list");
    fileGrid.classList.toggle("hidden", view !== "grid");
  }

  function extOf(name) {
    const i = name.lastIndexOf(".");
    return i >= 0 ? name.substring(i+1).toLowerCase() : "";
  }
  function isImage(ext) { return ["png","jpg","jpeg","gif","webp","svg"].includes(ext); }
  function isVideo(ext) { return ["mp4","webm","ogg"].includes(ext); }
  function isPdf(ext) { return ext === "pdf"; }

  async function getSession() {
    if (sb) {
      const { data } = await sb.auth.getUser();
      return data?.user || null;
    } else {
      const s = JSON.parse(localStorage.getItem("mx_session") || "null");
      return s ? { email: s.email, id: "demo-user" } : null;
    }
  }

  function bytesToSize(bytes) {
    if (!bytes && bytes !== 0) return "";
    const units = ["B","KB","MB","GB"];
    let i = 0;
    let v = bytes;
    while (v >= 1024 && i < units.length-1) { v/=1024; i++; }
    return v.toFixed(1) + " " + units[i];
  }

  function buildRowList(item, fullPath, sizeText, url, index) {
    const li = document.createElement("li");
    li.className = "rounded-md border border-white/10 bg-white/5 p-3 flex items-center justify-between gap-3";
    const nameBtn = document.createElement("button");
    nameBtn.className = "truncate text-left hover:underline";
    nameBtn.textContent = item.name;
    nameBtn.addEventListener("click", () => openLightbox(index));
    const right = document.createElement("div");
    right.className = "flex items-center gap-2 text-xs text-slate-400";
    const sizeSpan = document.createElement("span"); sizeSpan.textContent = sizeText || "";
    const openA = document.createElement("a"); openA.className="px-2 py-1 rounded-md bg-white/10 hover:bg-white/20 text-slate-200"; openA.textContent="Abrir"; openA.href=url || "#"; openA.target="_blank";
    const copyB = document.createElement("button"); copyB.className="px-2 py-1 rounded-md bg-white/10 hover:bg-white/20 text-slate-200"; copyB.textContent="Copiar link";
    const delB = document.createElement("button"); delB.className="px-2 py-1 rounded-md bg-white/10 hover:bg-white/20 text-red-300"; delB.textContent="Borrar";
    right.append(sizeSpan, openA, copyB, delB);
    li.append(nameBtn, right);
    copyB.addEventListener("click", async () => {
      try { await navigator.clipboard.writeText(url || fullPath); uploadMsg.textContent = "Link copiado."; }
      catch (e) { uploadMsg.textContent = e.message || "No se pudo copiar."; }
    });
    delB.addEventListener("click", async () => {
      if (!confirm("¿Borrar este archivo?")) return;
      if (sb) {
        const { error } = await sb.storage.from(bucket).remove([fullPath]);
        if (error) { uploadMsg.textContent = error.message; return; }
      } else {
        const items = JSON.parse(localStorage.getItem("mx_files") || "[]").filter(it => it.path !== fullPath);
        localStorage.setItem("mx_files", JSON.stringify(items));
      }
      li.remove();
    });
    fileList.prepend(li);
  }

  function buildCardGrid(item, fullPath, url, index) {
    const ext = extOf(item.name);
    const card = document.createElement("div");
    card.className = "rounded-lg border border-white/10 bg-white/5 p-3 space-y-2 group";
    const thumb = document.createElement("div");
    thumb.className = "thumb rounded-md overflow-hidden bg-black/30 cursor-zoom-in";
    if (isImage(ext)) {
      const img = document.createElement("img"); img.loading = "lazy"; img.alt = item.name; img.src = url || "#"; thumb.appendChild(img);
    } else if (isVideo(ext)) {
      const v = document.createElement("video"); v.src = url || "#"; v.controls = false; v.preload = "metadata"; v.muted = true; thumb.appendChild(v);
    } else if (isPdf(ext)) {
      const div = document.createElement("div"); div.className="w-full h-[160px] grid place-items-center text-xs text-slate-300"; div.textContent="PDF"; thumb.appendChild(div);
    } else {
      const div = document.createElement("div"); div.className="w-full h-[160px] grid place-items-center text-xs text-slate-300"; div.textContent=(ext || 'FILE').toUpperCase(); thumb.appendChild(div);
    }
    thumb.addEventListener("click", () => openLightbox(index));
    const name = document.createElement("div"); name.className = "truncate text-sm"; name.textContent = item.name;
    const actions = document.createElement("div");
    actions.className = "flex items-center gap-2 text-xs text-slate-400";
    const openA = document.createElement("a"); openA.className="px-2 py-1 rounded-md bg-white/10 hover:bg-white/20 text-slate-200"; openA.textContent="Abrir"; openA.href=url || "#"; openA.target="_blank";
    const copyB = document.createElement("button"); copyB.className="px-2 py-1 rounded-md bg-white/10 hover:bg-white/20 text-slate-200"; copyB.textContent="Copiar link";
    const delB = document.createElement("button"); delB.className="px-2 py-1 rounded-md bg-white/10 hover:bg-white/20 text-red-300"; delB.textContent="Borrar";
    actions.append(openA, copyB, delB);
    card.append(thumb, name, actions);
    fileGrid.prepend(card);

    copyB.addEventListener("click", async () => {
      try { await navigator.clipboard.writeText(url || fullPath); uploadMsg.textContent = "Link copiado."; }
      catch (e) { uploadMsg.textContent = e.message || "No se pudo copiar."; }
    });
    delB.addEventListener("click", async () => {
      if (!confirm("¿Borrar este archivo?")) return;
      if (sb) {
        const { error } = await sb.storage.from(bucket).remove([fullPath]);
        if (error) { uploadMsg.textContent = error.message; return; }
      } else {
        const items = JSON.parse(localStorage.getItem("mx_files") || "[]").filter(it => it.path !== fullPath);
        localStorage.setItem("mx_files", JSON.stringify(items));
      }
      card.remove();
    });
  }

  async function listFiles(uid) {
    fileList.innerHTML = "";
    fileGrid.innerHTML = "";
    itemsCache = [];
    if (sb) {
      const { data, error } = await sb.storage.from(bucket).list(uid, { limit: 200, sortBy: { column: "created_at", order: "desc" } });
      if (error) { uploadMsg.textContent = error.message; return; }
      let count = 0;
      for (const item of data || []) {
        const path = `${uid}/${item.name}`;
        const ext = extOf(item.name);
        let type = isImage(ext) ? "image" : isVideo(ext) ? "video" : isPdf(ext) ? "pdf" : "other";
        let signedUrl = "";
        try {
          const r = await sb.storage.from(bucket).createSignedUrl(path, 3600);
          signedUrl = r.data?.signedUrl || "";
        } catch (e) {}
        const index = itemsCache.length;
        itemsCache.push({ name: item.name, path, url: signedUrl, type });
        if (view === "grid") buildCardGrid(item, path, signedUrl, index);
        else buildRowList(item, path, "", signedUrl, index);
        count++;
      }
      statToday.textContent = count;
      statWeek.textContent = count;
      statMonth.textContent = count;
    } else {
      const items = JSON.parse(localStorage.getItem("mx_files") || "[]").reverse();
      statToday.textContent = items.slice(0,3).length;
      statWeek.textContent = Math.min(12, items.length);
      statMonth.textContent = items.length;
      items.forEach((it) => {
        const ext = extOf(it.name);
        const type = isImage(ext) ? "image" : isVideo(ext) ? "video" : isPdf(ext) ? "pdf" : "other";
        const index = itemsCache.length;
        itemsCache.push({ name: it.name, path: it.path, url: it.previewUrl || "#", type });
        if (view === "grid") buildCardGrid({ name: it.name }, it.path, it.previewUrl || "#", index);
        else buildRowList({ name: it.name }, it.path, it.size ? bytesToSize(it.size) : "", it.previewUrl || "#", index);
      });
    }
  }

  async function init() {
    renderLayout();
    const user = await getSession();
    if (!user) { window.location.href = "auth.html"; return; }
    userEmailEl.textContent = user.email || "";
    await listFiles(user.id);
  }

  uploadBtn.addEventListener("click", async () => {
    const files = document.getElementById("fileInput").files;
    if (!files || !files.length) { uploadMsg.textContent = "Selecciona archivos"; return; }
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
          items.push({ name: filename, size: f.size, path, previewUrl });
          localStorage.setItem("mx_files", JSON.stringify(items));
        }
      } catch (e) { uploadMsg.textContent = e.message || "Error al subir " + f.name; return; }
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

  // ---------- LIGHTBOX LOGIC ----------
  function resetTransform() { scale = 1; offsetX = 0; offsetY = 0; }
  function setTransform(el) {
    el.style.transform = `translate(${offsetX}px, ${offsetY}px) scale(${scale})`;
  }

  function renderLightboxContent(item) {
    stage.innerHTML = "";
    const wrapper = document.createElement("div");
    wrapper.className = "max-w-[90vw] max-h-[80vh] overflow-hidden";
    const inner = document.createElement(item.type === "video" ? "video" : (item.type === "pdf" ? "iframe" : "img"));
    inner.draggable = false;
    if (item.type === "image") {
      inner.src = item.url; inner.alt = item.name; inner.style.maxWidth = "90vw"; inner.style.maxHeight = "80vh";
    } else if (item.type === "video") {
      inner.src = item.url; inner.controls = true; inner.style.maxWidth = "90vw"; inner.style.maxHeight = "80vh";
    } else if (item.type === "pdf") {
      inner.src = item.url; inner.style.width = "90vw"; inner.style.height = "80vh";
    } else {
      const div = document.createElement("div"); div.className="text-slate-200";
      div.innerHTML = `<div class="text-center">No hay vista previa. <a class="underline" href="${item.url}" target="_blank">Abrir</a></div>`;
      wrapper.appendChild(div); stage.appendChild(wrapper); return;
    }
    inner.style.transition = "transform 0.05s linear";
    inner.style.transformOrigin = "center center";
    wrapper.appendChild(inner); stage.appendChild(wrapper);

    // Wheel zoom
    stage.onwheel = (e) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      scale = Math.max(0.25, Math.min(6, scale + delta));
      setTransform(inner);
    };

    // Drag to pan
    stage.onmousedown = (e) => { dragging = true; lastX = e.clientX; lastY = e.clientY; stage.style.cursor="grabbing"; };
    window.onmouseup = () => { dragging = false; stage.style.cursor="grab"; };
    window.onmousemove = (e) => {
      if (!dragging) return;
      offsetX += (e.clientX - lastX);
      offsetY += (e.clientY - lastY);
      lastX = e.clientX; lastY = e.clientY;
      setTransform(inner);
    };

    // Double click reset
    stage.ondblclick = () => { resetTransform(); setTransform(inner); };
  }

  function openLightbox(index) {
    currentIndex = index;
    resetTransform();
    const item = itemsCache[currentIndex];
    renderLightboxContent(item);
    caption.textContent = item.name + " (" + (currentIndex+1) + "/" + itemsCache.length + ")";
    lightbox.classList.remove("hidden");
    document.body.classList.add("overflow-hidden");
  }

  function closeLightbox() {
    lightbox.classList.add("hidden");
    document.body.classList.remove("overflow-hidden");
    stage.innerHTML = "";
  }

  function nextItem() {
    if (itemsCache.length === 0) return;
    currentIndex = (currentIndex + 1) % itemsCache.length;
    resetTransform();
    renderLightboxContent(itemsCache[currentIndex]);
    caption.textContent = itemsCache[currentIndex].name + " (" + (currentIndex+1) + "/" + itemsCache.length + ")";
  }
  function prevItem() {
    if (itemsCache.length === 0) return;
    currentIndex = (currentIndex - 1 + itemsCache.length) % itemsCache.length;
    resetTransform();
    renderLightboxContent(itemsCache[currentIndex]);
    caption.textContent = itemsCache[currentIndex].name + " (" + (currentIndex+1) + "/" + itemsCache.length + ")";
  }

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

  // Expose to builder funcs
  window.openLightbox = openLightbox;

  init();
})();