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
  const statToday = document.getElementById("statToday");
  const statWeek = document.getElementById("statWeek");
  const statMonth = document.getElementById("statMonth");

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

  function row(item, fullPath, sizeText, signedUrl) {
    const li = document.createElement("li");
    li.className = "rounded-md border border-white/10 bg-white/5 p-3 flex items-center justify-between gap-3";
    li.innerHTML = `<div class="truncate">${item.name}</div>
      <div class="flex items-center gap-2 text-xs text-slate-400">
        <span>${sizeText || ""}</span>
        <button class="px-2 py-1 rounded-md bg-white/10 hover:bg-white/20 text-slate-200 copyBtn">Copiar link</button>
        <button class="px-2 py-1 rounded-md bg-white/10 hover:bg-white/20 text-red-300 delBtn">Borrar</button>
      </div>`;
    li.querySelector(".copyBtn").addEventListener("click", async () => {
      try {
        let url = signedUrl;
        if (!url && sb) {
          const { data, error } = await sb.storage.from(bucket).createSignedUrl(fullPath, 3600);
          if (error) throw error;
          url = data.signedUrl;
        }
        await navigator.clipboard.writeText(url || fullPath);
        uploadMsg.textContent = "Link copiado.";
      } catch (e) {
        uploadMsg.textContent = e.message || "No se pudo copiar.";
      }
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
    fileList.prepend(li);
  }

  async function listFiles(uid) {
    fileList.innerHTML = "";
    if (sb) {
      const { data, error } = await sb.storage.from(bucket).list(uid, { limit: 100, sortBy: { column: "created_at", order: "desc" } });
      if (error) { uploadMsg.textContent = error.message; return; }
      let count = 0;
      for (const item of data || []) {
        const path = `${uid}/${item.name}`;
        // size no viene en list(); omitimos o consultamos vía signed URL metadata (no trivial). Mostramos nombre + copy link.
        row(item, path, "", null);
        count++;
      }
      statToday.textContent = count;
      statWeek.textContent = count;
      statMonth.textContent = count;
    } else {
      const items = JSON.parse(localStorage.getItem("mx_files") || "[]");
      statToday.textContent = items.slice(-3).length;
      statWeek.textContent = Math.min(12, items.length);
      statMonth.textContent = items.length;
      items.forEach((it) => row({ name: it.name }, it.path, bytesToSize(it.size), null));
    }
  }

  async function init() {
    const user = await getSession();
    if (!user) { window.location.href = "auth.html"; return; }
    userEmailEl.textContent = user.email || "";
    await listFiles(user.id);
  }

  uploadBtn.addEventListener("click", async () => {
    const f = document.getElementById("fileInput").files[0];
    if (!f) { uploadMsg.textContent = "Selecciona un archivo"; return; }
    uploadMsg.textContent = "Subiendo...";

    const user = await getSession();
    if (!user) { window.location.href = "auth.html"; return; }

    const filename = `${Date.now()}_${f.name}`;
    const path = `${user.id}/${filename}`;

    try {
      if (sb) {
        const { error } = await sb.storage.from(bucket).upload(path, f, { upsert: true, cacheControl: "3600" });
        if (error) throw error;
        uploadMsg.textContent = "Subido ✔ — actualizando lista...";
      } else {
        const items = JSON.parse(localStorage.getItem("mx_files") || "[]");
        items.push({ name: filename, size: f.size, path });
        localStorage.setItem("mx_files", JSON.stringify(items));
        uploadMsg.textContent = "Subido (demo).";
      }
      await listFiles(user.id);
    } catch (e) {
      uploadMsg.textContent = e.message || "Error al subir.";
    }
  });

  logoutBtn.addEventListener("click", async () => {
    if (sb) await sb.auth.signOut();
    localStorage.removeItem("mx_session");
    window.location.href = "index.html";
  });

  init();
})();