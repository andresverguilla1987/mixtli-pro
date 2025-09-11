// Failsafe app: robust wiring + global error capture + clear logs
(() => {
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);
  const logBox = $("#devlog");

  // Toasts
  const toasts = $("#toastHost");
  function toast(msg, kind="ok", ms=1600) {
    const el = document.createElement("div");
    el.className = "toast " + (kind === "err" ? "err" : "ok");
    el.textContent = msg;
    toasts.appendChild(el);
    setTimeout(() => { el.style.opacity = "0"; el.style.transform = "translateY(-6px)"; }, ms);
    setTimeout(() => { el.remove(); }, ms + 250);
  }
  function log(...args) {
    try {
      const line = document.createElement("div");
      line.innerHTML = args.map(a => typeof a === "string" ? a : JSON.stringify(a)).join(" ");
      logBox.appendChild(line);
      logBox.scrollTop = logBox.scrollHeight;
    } catch {}
    console.log("[Mixtli]", ...args);
  }
  window.addEventListener("error", (e) => { log("<b>error:</b> " + (e.message||e.error)); toast("JS error", "err", 2000); });
  window.addEventListener("unhandledrejection", (e) => { log("<b>promise:</b> " + e.reason); toast("Promise error", "err", 2000); });

  // Tabs
  const tabs = $$(".tab");
  tabs.forEach(t => t.addEventListener("click", () => {
    tabs.forEach(x => x.classList.remove("active")); t.classList.add("active");
    $$(".view").forEach(v => v.classList.remove("show")); $("#" + t.dataset.view).classList.add("show");
  }));

  // Config wiring
  const apiBaseInput = $("#apiBase");
  const apiStatus = $("#apiStatus");
  const btnSave = document.querySelector('[data-action="saveApi"]');
  const btnReset = document.querySelector('[data-action="resetApi"]');
  const btnTest = document.querySelector('[data-action="testApi"]');
  const btnLog = document.querySelector('[data-action="toggleLog"]');

  function getApiBase() {
    return (localStorage.getItem("api_base") || "").trim();
  }
  function setApiBase(v) {
    if (v === null || v === undefined) v = "";
    localStorage.setItem("api_base", v.trim());
    toast("API Base guardada");
    apiStatus.textContent = "API Base: " + (v || "(vacío: usa proxy)");
  }
  function applyApiBaseToUI() {
    apiBaseInput.value = getApiBase();
    apiStatus.textContent = "API Base: " + (getApiBase() || "(vacío: usa proxy)");
  }
  btnSave.addEventListener("click", () => setApiBase(apiBaseInput.value));
  btnReset.addEventListener("click", () => { localStorage.removeItem("api_base"); applyApiBaseToUI(); toast("Reset OK"); });
  btnTest.addEventListener("click", async () => {
    try {
      const base = getApiBase();
      const url = (base ? base.replace(/\/$/,"") : "") + "/api/health";
      log("GET", url);
      const r = await fetch(url, { method: "GET", credentials: "include" });
      const t = await r.text();
      apiStatus.textContent = `Health ${r.status}: ${t}`;
      toast("Health " + r.status);
    } catch (e) {
      apiStatus.textContent = "Health error: " + e;
      toast("Health error", "err");
      log("<b>health error:</b>", e);
    }
  });
  btnLog.addEventListener("click", () => { logBox.hidden = !logBox.hidden; });

  // init UI config
  applyApiBaseToUI();

  // Transfer wiring
  const drop = $("#drop");
  const fileInput = $("#fileInput");
  const fileInfo = $("#fileInfo");
  const btnUpload = $("#btnUpload");
  const uploadStatus = $("#uploadStatus");
  const progressWrap = $("#progressWrap");
  const progressBar = $("#progressBar");
  const progressMeta = $("#progressMeta");
  const progressPct = $("#progressPct");
  const progressSpeed = $("#progressSpeed");
  const progressEta = $("#progressEta");
  const publicUrlInput = $("#publicUrl");
  const btnCopy = $("#btnCopy");
  const btnOpen = $("#btnOpen");
  const preview = $("#preview");
  const imgPreview = $("#imgPreview");

  let file = null;

  function setPublicUrl(url) {
    if (!url) return;
    publicUrlInput.value = url;
    btnCopy.disabled = false;
    btnOpen.disabled = false;
    if (/\.(png|jpg|jpeg|gif|webp|avif)$/i.test(url)) {
      imgPreview.src = url + (url.includes("?") ? "&" : "?") + "t=" + Date.now();
      preview.hidden = false;
    } else {
      preview.hidden = true;
      imgPreview.removeAttribute("src");
    }
  }

  function onGotFile(f) {
    file = f;
    fileInfo.textContent = file ? `Archivo: ${file.name} (${Math.ceil(file.size/1024)} KB)` : "";
    btnUpload.disabled = !file;
  }

  fileInput.addEventListener("change", (ev) => {
    if (ev.target.files && ev.target.files[0]) onGotFile(ev.target.files[0]);
  });
  ["dragenter","dragover"].forEach(evt => drop.addEventListener(evt, (e) => {
    e.preventDefault(); e.stopPropagation(); drop.classList.add("drag");
  }));
  ["dragleave","drop"].forEach(evt => drop.addEventListener(evt, (e) => {
    e.preventDefault(); e.stopPropagation(); drop.classList.remove("drag");
  }));
  drop.addEventListener("drop", (e) => {
    const dt = e.dataTransfer;
    if (dt && dt.files && dt.files[0]) onGotFile(dt.files[0]);
  });

  async function getPresign(filename, contentType) {
    const base = getApiBase();
    const GETurl = (base ? base.replace(/\/$/,"") : "") + `/api/presign?filename=${encodeURIComponent(filename)}&contentType=${encodeURIComponent(contentType)}`;
    try {
      log("GET", GETurl);
      const r = await fetch(GETurl, { method: "GET", credentials: "include" });
      if (r.ok) return await r.json();
      log("<b>GET presign status:</b>", r.status);
    } catch (e) {
      log("<b>GET presign error:</b>", e);
    }
    const POSTurl = (base ? base.replace(/\/$/,"") : "") + `/api/presign`;
    log("POST", POSTurl);
    const r2 = await fetch(POSTurl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ filename, contentType })
    });
    if (!r2.ok) throw new Error(`presign ${r2.status}`);
    return await r2.json();
  }

  function putWithProgress(presign, file) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open(presign.method || "PUT", presign.url, true);
      const headers = presign.headers || {};
      Object.keys(headers).forEach((k) => {
        try { xhr.setRequestHeader(k, headers[k]); } catch (_) {}
      });

      let start = Date.now();
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const pct = Math.round((e.loaded / e.total) * 100);
          progressBar.style.width = pct + "%";
          progressPct.textContent = pct + "%";
          const secs = (Date.now() - start)/1000;
          const speed = secs > 0 ? (e.loaded/1024/1024)/secs : 0;
          progressSpeed.textContent = speed.toFixed(2) + " MB/s";
          const remain = e.total - e.loaded;
          const eta = speed > 0 ? (remain/1024/1024)/speed : 0;
          progressEta.textContent = "ETA: " + (eta > 60 ? Math.round(eta/60) + "m" : Math.round(eta) + "s");
        }
      };
      xhr.onload = () => {
        const ok = xhr.status >= 200 && xhr.status < 300;
        ok ? resolve(xhr) : reject(new Error(`PUT fallo (${xhr.status})`));
      };
      xhr.onerror = () => reject(new Error("Error de red/CORS en PUT"));
      xhr.send(file);
    });
  }

  $("#btnUpload").addEventListener("click", async () => {
    if (!file) return;
    uploadStatus.textContent = "Generando presign…";
    progressWrap.hidden = false; progressMeta.hidden = false;
    progressBar.style.width = "0%"; progressPct.textContent = "0%"; progressSpeed.textContent = "0 MB/s"; progressEta.textContent = "ETA: --s";
    try {
      const presign = await getPresign(file.name, file.type || "application/octet-stream");
      if (!presign || !presign.url) throw new Error("presign inválido");
      log("presign ok:", presign.key);
      uploadStatus.textContent = "Subiendo…";
      await putWithProgress(presign, file);
      uploadStatus.textContent = "Subida completa ✓"; uploadStatus.style.color = "#7ee787";
      const url = presign.publicUrl || (presign.publicBase && presign.key ? `${presign.publicBase.replace(/\/$/, "")}/${presign.key}` : "");
      if (url) setPublicUrl(url);
      toast("Archivo subido");
    } catch (err) {
      uploadStatus.textContent = err.message || String(err);
      uploadStatus.style.color = "#ff9797";
      toast("Error: " + (err.message || "fallo"), "err", 2200);
      log("<b>upload error:</b>", err);
    }
  });

  btnCopy.addEventListener("click", async () => {
    const url = publicUrlInput.value.trim();
    if (!url) return;
    try { await navigator.clipboard.writeText(url); toast("Enlace copiado"); } catch { toast("Copiado", "ok"); }
  });
  btnOpen.addEventListener("click", () => {
    const url = publicUrlInput.value.trim();
    if (!url) return;
    window.open(url, "_blank");
  });
})();