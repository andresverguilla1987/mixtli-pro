/* global window, localStorage, supabase */
(() => {
  const cfg = window.CONFIG || { mode: "demo" };
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

  // Get session
  async function getSessionEmail() {
    if (sb) {
      const { data } = await sb.auth.getUser();
      return data?.user?.email || null;
    } else {
      const s = JSON.parse(localStorage.getItem("mx_session") || "null");
      return s?.email || null;
    }
  }

  async function init() {
    const email = await getSessionEmail();
    if (!email) { window.location.href = "auth.html"; return; }
    userEmailEl.textContent = email;

    // Load previous uploaded files (demo only)
    const items = JSON.parse(localStorage.getItem("mx_files") || "[]");
    items.forEach((it) => addItem(it.name, it.size));

    // Stats (fake)
    statToday.textContent = items.slice(-3).length;
    statWeek.textContent = Math.min(12, items.length);
    statMonth.textContent = items.length;
  }

  function addItem(name, size) {
    const li = document.createElement("li");
    li.className = "rounded-md border border-white/10 bg-white/5 p-3 flex items-center justify-between";
    li.innerHTML = `<span>${name}</span><span class="text-xs text-slate-400">${(size/1024).toFixed(1)} KB</span>`;
    fileList.prepend(li);
  }

  uploadBtn.addEventListener("click", () => {
    const f = document.getElementById("fileInput").files[0];
    if (!f) { uploadMsg.textContent = "Selecciona un archivo"; return; }
    // DEMO: solo listar. En real, aquí integrarías S3/Supabase Storage.
    const items = JSON.parse(localStorage.getItem("mx_files") || "[]");
    items.push({ name: f.name, size: f.size, at: Date.now() });
    localStorage.setItem("mx_files", JSON.stringify(items));
    addItem(f.name, f.size);
    uploadMsg.textContent = "Subida simulada (demo).";
  });

  logoutBtn.addEventListener("click", async () => {
    if (sb) await sb.auth.signOut();
    localStorage.removeItem("mx_session");
    window.location.href = "index.html";
  });

  init();
})();