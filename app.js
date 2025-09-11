(() => {
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  // Views / Tabs
  const tabs = $$(".tab");
  tabs.forEach(t => t.addEventListener("click", () => {
    tabs.forEach(x => x.classList.remove("active"));
    t.classList.add("active");
    $$(".view").forEach(v => v.classList.remove("show"));
    $("#" + t.dataset.view).classList.add("show");
  }));
  // Button go-to
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

  // Transfer elements
  const drop = $("#drop");
  const fileInput = $("#fileInput");
  const fileInfo = $("#fileInfo");
  const btnUpload = $("#btnUpload");
  const uploadStatus = $("#uploadStatus");
  const progressWrap = $("#progressWrap");
  const progressBar = $("#progressBar");
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
    const API_BASE = window.API_BASE || "";
    // Intento #1: GET con query
    let url = `${API_BASE}/api/presign?filename=${encodeURIComponent(filename)}&contentType=${encodeURIComponent(contentType)}`;
    try {
      const r = await fetch(url, { method: "GET", credentials: "include" });
      if (r.ok) return await r.json();
    } catch (_) {}
    // Intento #2: POST con body JSON
    try {
      const r2 = await fetch(`${API_BASE}/api/presign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ filename, contentType })
      });
      if (r2.ok) return await r2.json();
      const txt = await r2.text();
      throw new Error(`Fallo presign (${r2.status}): ${txt}`);
    } catch (err) {
      throw err;
    }
  }

  function putWithProgress(presign, file) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open(presign.method || "PUT", presign.url, true);
      const headers = presign.headers || {};
      Object.keys(headers).forEach((k) => {
        try { xhr.setRequestHeader(k, headers[k]); } catch (_) {}
      });
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const pct = Math.round((e.loaded / e.total) * 100);
          progressBar.style.width = pct + "%";
        }
      };
      xhr.onload = () => {
        const ok = xhr.status >= 200 && xhr.status < 300;
        ok ? resolve(xhr) : reject(new Error(`PUT fallo (${xhr.status}): ${xhr.responseText || "Sin cuerpo"}`));
      };
      xhr.onerror = () => reject(new Error("Error de red/CORS en PUT"));
      xhr.send(file);
    });
  }

  btnUpload.addEventListener("click", async () => {
    if (!file) return;
    uploadStatus.textContent = "Generando presign…";
    uploadStatus.style.color = "";
    progressWrap.hidden = false;
    progressBar.style.width = "0%";

    try {
      const presign = await getPresign(file.name, file.type || "application/octet-stream");
      if (!presign || !presign.url) throw new Error("Respuesta de presign inválida");
      uploadStatus.textContent = "Subiendo…";
      await putWithProgress(presign, file);
      uploadStatus.textContent = "Subida completa ✓";
      uploadStatus.style.color = "#7ee787";
      if (presign.publicUrl) setPublicUrl(presign.publicUrl);
      else {
        // fallback: si el backend también retorna key + base público conocido
        if (presign.key && presign.publicBase) setPublicUrl(`${presign.publicBase.replace(/\/$/, "")}/${presign.key}`);
      }
    } catch (err) {
      uploadStatus.textContent = err.message || String(err);
      uploadStatus.style.color = "#ff9797";
    }
  });

  btnCopy.addEventListener("click", async () => {
    const url = publicUrlInput.value.trim();
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      btnCopy.textContent = "Copiado ✓";
      setTimeout(() => (btnCopy.textContent = "Copiar enlace"), 900);
    } catch {
      btnCopy.textContent = "Listo ✓";
      setTimeout(() => (btnCopy.textContent = "Copiar enlace"), 900);
    }
  });

  btnOpen.addEventListener("click", () => {
    const url = publicUrlInput.value.trim();
    if (!url) return;
    window.open(url, "_blank");
  });
})();