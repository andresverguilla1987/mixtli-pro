(() => {
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  // Tabs / Views
  const tabs = $$(".tab");
  tabs.forEach(t => t.addEventListener("click", () => {
    tabs.forEach(x => x.classList.remove("active"));
    t.classList.add("active");
    $$(".view").forEach(v => v.classList.remove("show"));
    $("#" + t.dataset.view).classList.add("show");
  }));
  $("[data-goto='transfer']").addEventListener("click", () => {
    $$(".tab").forEach(x => x.classList.remove("active"));
    document.querySelector('.tab[data-view="transfer"]').classList.add("active");
    $$(".view").forEach(v => v.classList.remove("show"));
    $("#transfer").classList.add("show");
  });

  // Auth toggle (visual only)
  const pillBtns = $$(".pillbtn");
  pillBtns.forEach(btn => btn.addEventListener("click", () => {
    pillBtns.forEach(x => x.classList.remove("active"));
    btn.classList.add("active");
  }));

  // Toasts
  const toasts = $("#toastHost");
  function toast(msg, kind="ok", ms=1500) {
    const el = document.createElement("div");
    el.className = "toast " + (kind === "err" ? "err" : "ok");
    el.textContent = msg;
    toasts.appendChild(el);
    setTimeout(() => { el.style.opacity = "0"; el.style.transform = "translateY(-6px)"; }, ms);
    setTimeout(() => { el.remove(); }, ms + 250);
  }

  // Transfer elements
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
  const recent = $("#recent");

  let file = null;
  let recentUploads = [];

  function fmtSize(bytes) {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024*1024) return (bytes/1024).toFixed(1) + " KB";
    if (bytes < 1024*1024*1024) return (bytes/1024/1024).toFixed(1) + " MB";
    return (bytes/1024/1024/1024).toFixed(2) + " GB";
  }
  function extFromName(name) {
    const m = name.toLowerCase().match(/\.([a-z0-9]+)$/i);
    return m ? m[1] : "";
  }
  function makeThumb(url) {
    if (/\.(png|jpg|jpeg|gif|webp|avif)$/i.test(url)) return url;
    return ""; // non-image: we show a gradient bg
  }
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
  function renderRecent() {
    recent.innerHTML = "";
    recentUploads.slice().reverse().forEach(item => {
      const tile = document.createElement("div");
      tile.className = "tile";
      const thumb = document.createElement("img");
      const thumbUrl = makeThumb(item.url);
      if (thumbUrl) {
        thumb.src = thumbUrl;
        thumb.className = "thumb";
      } else {
        const ph = document.createElement("div");
        ph.className = "thumb";
        ph.style.display = "grid";
        ph.style.placeItems = "center";
        ph.innerHTML = `<span style="color:#8aa0b6;font-size:12px;">.${item.ext.toUpperCase()}</span>`;
        tile.appendChild(ph);
      }
      if (thumbUrl) tile.appendChild(thumb);
      const meta = document.createElement("div");
      meta.className = "meta";
      const badges = document.createElement("div");
      badges.className = "badges";
      const b1 = document.createElement("span");
      b1.className = "badge2";
      b1.textContent = "." + item.ext;
      const b2 = document.createElement("span");
      b2.className = "badge2";
      b2.textContent = fmtSize(item.size);
      badges.appendChild(b1); badges.appendChild(b2);
      const name = document.createElement("div");
      name.textContent = item.name;
      name.style.whiteSpace = "nowrap";
      name.style.overflow = "hidden";
      name.style.textOverflow = "ellipsis";
      const actions = document.createElement("div");
      actions.className = "actions";
      const openBtn = document.createElement("button");
      openBtn.textContent = "Abrir";
      openBtn.onclick = () => window.open(item.url, "_blank");
      const copyBtn = document.createElement("button");
      copyBtn.textContent = "Copiar";
      copyBtn.onclick = async () => {
        try { await navigator.clipboard.writeText(item.url); toast("Enlace copiado"); } catch { toast("Copiado", "ok"); }
      };
      actions.appendChild(openBtn); actions.appendChild(copyBtn);
      meta.appendChild(badges);
      meta.appendChild(name);
      meta.appendChild(actions);
      tile.appendChild(meta);
      recent.appendChild(tile);
    });
  }

  function onGotFile(f) {
    file = f;
    fileInfo.textContent = file ? `Archivo: ${file.name} (${fmtSize(file.size)})` : "";
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
    const API_BASE = window.API_BASE || "";
    // Try GET with query (same-domain cookies allowed)
    let url = `${API_BASE}/api/presign?filename=${encodeURIComponent(filename)}&contentType=${encodeURIComponent(contentType)}`;
    try {
      const r = await fetch(url, { method: "GET", credentials: "include" });
      if (r.ok) return await r.json();
    } catch (_) {}
    // Fallback: POST JSON
    const r2 = await fetch(`${API_BASE}/api/presign`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ filename, contentType })
    });
    if (r2.ok) return await r2.json();
    throw new Error(`Fallo presign (${r2.status})`);
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
    uploadStatus.style.color = "";
    progressWrap.hidden = false;
    progressMeta.hidden = false;
    progressBar.style.width = "0%";
    progressPct.textContent = "0%";
    progressSpeed.textContent = "0 MB/s";
    progressEta.textContent = "ETA: --s";

    try {
      const presign = await getPresign(file.name, file.type || "application/octet-stream");
      if (!presign || !presign.url) throw new Error("Respuesta de presign inválida");
      uploadStatus.textContent = "Subiendo…";
      await putWithProgress(presign, file);
      uploadStatus.textContent = "Subida completa ✓";
      uploadStatus.style.color = "#7ee787";
      const url = presign.publicUrl || (presign.publicBase && presign.key ? `${presign.publicBase.replace(/\/$/, "")}/${presign.key}` : "");
      if (url) setPublicUrl(url);

      // add to recent
      recentUploads.push({ name: file.name, size: file.size, url, ext: extFromName(file.name) });
      renderRecent();
      toast("Archivo subido", "ok");
    } catch (err) {
      uploadStatus.textContent = err.message || String(err);
      uploadStatus.style.color = "#ff9797";
      toast("Error: " + (err.message || "fallo"), "err");
    }
  });

  btnCopy.addEventListener("click", async () => {
    const url = publicUrlInput.value.trim();
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      toast("Enlace copiado", "ok");
    } catch {
      toast("Copiado", "ok");
    }
  });

  btnOpen.addEventListener("click", () => {
    const url = publicUrlInput.value.trim();
    if (!url) return;
    window.open(url, "_blank");
  });
})();