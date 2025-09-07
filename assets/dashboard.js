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

  let view = "grid"; // default

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

  function rowList(item, fullPath, sizeText, signedUrl) {
    const li = document.createElement("li");
    li.className = "rounded-md border border-white/10 bg-white/5 p-3 flex items-center justify-between gap-3";
    li.innerHTML = `<div class="truncate">${item.name}</div>
      <div class="flex items-center gap-2 text-xs text-slate-400">
        <span>${sizeText || ""}</span>
        <a class="px-2 py-1 rounded-md bg-white/10 hover:bg-white/20 text-slate-200" href="${signedUrl || "#"}" target="_blank">Abrir</a>
        <button class="px-2 py-1 rounded-md bg-white/10 hover:bg-white/20 text-slate-200 copyBtn">Copiar link</button>
        <button class="px-2 py-1 rounded-md bg-white/10 hover:bg-white/20 text-red-300 delBtn">Borrar</button>
      </div>`;
    attachRowHandlers(li, fullPath, signedUrl);
    fileList.prepend(li);
  }

  function cardGrid(item, fullPath, sizeText, signedUrl) {
    const ext = extOf(item.name);
    const card = document.createElement("div");
    card.className = "rounded-lg border border-white/10 bg-white/5 p-3 space-y-2";
    const thumb = document.createElement("div");
    thumb.className = "thumb rounded-md overflow-hidden bg-black/30";
    if (isImage(ext)) {
      const img = document.createElement("img"); img.loading = "lazy"; img.alt = item.name; img.src = signedUrl || "#"; thumb.appendChild(img);
    } else if (isVideo(ext)) {
      const v = document.createElement("video"); v.src = signedUrl || "#"; v.controls = true; v.preload = "metadata"; v.muted = true; thumb.appendChild(v);
    } else if (isPdf(ext)) {
      const div = document.createElement("div"); div.className="w-full h-[160px] grid place-items-center text-xs text-slate-300"; div.textContent="PDF"; thumb.appendChild(div);
    } else {
      const div = document.createElement("div"); div.className="w-full h-[160px] grid place-items-center text-xs text-slate-300"; div.textContent=(ext || 'file').toUpperCase(); thumb.appendChild(div);
    }
    const name = document.createElement("div"); name.className = "truncate text-sm"; name.textContent = item.name;
    const actions = document.createElement("div");
    actions.className = "flex items-center gap-2 text-xs text-slate-400";
    const openA = document.createElement("a"); openA.className="px-2 py-1 rounded-md bg-white/10 hover:bg-white/20 text-slate-200"; openA.textContent="Abrir"; openA.href=signedUrl || "#"; openA.target="_blank";
    const copyB = document.createElement("button"); copyB.className="px-2 py-1 rounded-md bg-white/10 hover:bg-white/20 text-slate-200"; copyB.textContent="Copiar link";
    const delB = document.createElement("button"); delB.className="px-2 py-1 rounded-md bg-white/10 hover:bg-white/20 text-red-300"; delB.textContent="Borrar";
    actions.append(openA, copyB, delB);
    card.append(thumb, name, actions);
    fileGrid.prepend(card);

    copyB.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(signedUrl || fullPath);
        uploadMsg.textContent = "Link copiado.";
      } catch (e) { uploadMsg.textContent = e.message || "No se pudo copiar."; }
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

  function attachRowHandlers(li, fullPath, signedUrl) {
    li.querySelector(".copyBtn").addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(signedUrl || fullPath);
        uploadMsg.textContent = "Link copiado.";
      } catch (e) { uploadMsg.textContent = e.message || "No se pudo copiar."; }
    });
    li.querySelector(".delBtn").addEventListener("click", async () => {
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
  }

  async function listFiles(uid) {
    fileList.innerHTML = "";
    fileGrid.innerHTML = "";
    if (sb) {
      const { data, error } = await sb.storage.from(bucket).list(uid, { limit: 100, sortBy: { column: "created_at", order: "desc" } });
      if (error) { uploadMsg.textContent = error.message; return; }
      let count = 0;
      for (const item of data || []) {
        const path = `${uid}/${item.name}`;
        const ext = extOf(item.name);
        // signed URL for preview/open
        let signedUrl = "";
        try {
          const r = await sb.storage.from(bucket).createSignedUrl(path, 3600);
          signedUrl = r.data?.signedUrl || "";
        } catch (e) {}
        if (view === "grid") cardGrid(item, path, "", signedUrl);
        else rowList(item, path, "", signedUrl);
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
      for (const it of items) {
        const ext = extOf(it.name);
        const fakeUrl = it.previewUrl || "#";
        if (view === "grid") cardGrid({ name: it.name }, it.path, it.size ? bytesToSize(it.size) : "", fakeUrl);
        else rowList({ name: it.name }, it.path, it.size ? bytesToSize(it.size) : "", fakeUrl);
      }
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
          // For demo preview create a blob URL (not persistent across reload)
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

  init();
})();