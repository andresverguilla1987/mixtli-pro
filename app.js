(() => {
  let presign = null;
  let file = null;

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  const presignJson = $("#presignJson");
  const btnParse = $("#btnParse");
  const presignStatus = $("#presignStatus");
  const fileInput = $("#fileInput");
  const drop = $("#drop");
  const fileInfo = $("#fileInfo");
  const btnUpload = $("#btnUpload");
  const uploadStatus = $("#uploadStatus");
  const progressWrap = $("#progressWrap");
  const progressBar = $("#progressBar");
  const publicUrlInput = $("#publicUrl");
  const btnOpen = $("#btnOpen");
  const btnCopy = $("#btnCopy");
  const preview = $("#preview");
  const imgPreview = $("#imgPreview");

  function setPublicUrl(url) {
    if (!url) return;
    publicUrlInput.value = url;
    btnOpen.disabled = false;
    btnCopy.disabled = false;
    // pre-visualiza si es imagen
    if (/(\.png|\.jpg|\.jpeg|\.gif|\.webp|\.avif)$/i.test(url)) {
      imgPreview.src = url + (url.includes('?') ? '&' : '?') + 't=' + Date.now();
      preview.hidden = false;
    } else {
      preview.hidden = true;
      imgPreview.removeAttribute('src');
    }
  }

  btnParse.addEventListener('click', () => {
    try {
      const parsed = JSON.parse(presignJson.value);
      if (!parsed || !parsed.url || !parsed.method) throw new Error("JSON inválido o faltan campos");
      presign = parsed;
      presignStatus.textContent = "Presign cargado ✓";
      presignStatus.style.color = "#7ee787";
      if (presign.publicUrl) setPublicUrl(presign.publicUrl);
      btnUpload.disabled = !file || !presign;
    } catch (e) {
      presignStatus.textContent = "Error: " + e.message;
      presignStatus.style.color = "#ff9797";
      presign = null;
      btnUpload.disabled = true;
    }
  });

  function onGotFile(f) {
    file = f;
    fileInfo.textContent = file ? `Archivo: ${file.name} (${Math.ceil(file.size/1024)} KB)` : "";
    btnUpload.disabled = !file || !presign;
  }

  fileInput.addEventListener('change', (ev) => {
    if (ev.target.files && ev.target.files[0]) onGotFile(ev.target.files[0]);
  });

  // Drag & drop
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

  btnUpload.addEventListener('click', async () => {
    if (!presign || !file) return;
    uploadStatus.textContent = "Subiendo…";
    uploadStatus.style.color = "";
    progressWrap.hidden = false;
    progressBar.style.width = "0%";

    // Usamos XMLHttpRequest para tener progreso
    const xhr = new XMLHttpRequest();
    xhr.open(presign.method || "PUT", presign.url, true);

    // Headers del presign
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
      if (ok) {
        uploadStatus.textContent = "Subida completa ✓ (" + xhr.status + ")";
        uploadStatus.style.color = "#7ee787";
        // Establece la URL pública si viene en el JSON
        if (presign.publicUrl) setPublicUrl(presign.publicUrl);
      } else {
        uploadStatus.textContent = "Fallo (" + xhr.status + "): " + (xhr.responseText || "Sin cuerpo");
        uploadStatus.style.color = "#ff9797";
      }
    };
    xhr.onerror = () => {
      uploadStatus.textContent = "Error de red/ CORS.";
      uploadStatus.style.color = "#ff9797";
    };
    xhr.send(file);
  });

  btnOpen.addEventListener('click', () => {
    const url = publicUrlInput.value.trim();
    if (!url) return;
    window.open(url, "_blank");
  });

  btnCopy.addEventListener('click', async () => {
    const url = publicUrlInput.value.trim();
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      btnCopy.textContent = "Copiado ✓";
      setTimeout(() => (btnCopy.textContent = "Copiar URL"), 1000);
    } catch {
      // fallback
      btnCopy.textContent = "Listo ✓";
      setTimeout(() => (btnCopy.textContent = "Copiar URL"), 1000);
    }
  });

  // Quality of life: si el usuario pegó algo en el textarea y es válido, auto-carga
  presignJson.addEventListener('blur', () => {
    if (!presign) {
      try {
        const parsed = JSON.parse(presignJson.value);
        if (parsed && parsed.url && parsed.method) {
          presign = parsed;
          presignStatus.textContent = "Presign cargado ✓";
          presignStatus.style.color = "#7ee787";
          if (presign.publicUrl) setPublicUrl(presign.publicUrl);
          btnUpload.disabled = !file || !presign;
        }
      } catch {}
    }
  });
})();