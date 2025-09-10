/**
 * Mixtli Frontend – resilient uploader (R2/S3 presigned)
 * Works with endpoints:
 *   - GET  /healthz   or /salud                   (optional check)
 *   - POST /api/users                             (register demo)
 *   - POST /upload/presign  (preferred)
 *   - POST /api/upload/presign   (fallback)
 *   - POST /api/uploads/presign  (fallback)
 *   - POST /upload/complete     (with { key })
 *   - POST /api/upload/complete (fallback)
 *   - POST /api/uploads/complete (fallback)
 *
 * NOTE: HTML must have inputs/buttons with these IDs:
 *   apiBase, btnSave, btnReset, email, password,
 *   btnRegister, btnLogin, btnLogout, file, btnUpload,
 *   sessionNote, status, log
 */

(() => {
  const $ = (id) => document.getElementById(id);

  // Elements (some may be absent depending on your template)
  const E = {
    apiBase: $("apiBase"),
    btnSave: $("btnSave"),
    btnReset: $("btnReset"),
    email: $("email"),
    password: $("password"),
    btnRegister: $("btnRegister"),
    btnLogin: $("btnLogin"),
    btnLogout: $("btnLogout"),
    file: $("file"),
    btnUpload: $("btnUpload"),
    sessionNote: $("sessionNote"),
    status: $("status"),
    log: $("log")
  };

  const state = {
    apiBase: localStorage.getItem("API_BASE") || "",
    logged: false,
    me: null,
  };

  const setText = (el, text) => { if (el) el.textContent = text; };
  const appendLog = (msg) => {
    if (!E.log) return;
    const time = new Date().toISOString().replace("T", " ").replace("Z","");
    E.log.value += `[${time}] ${msg}\n`;
    E.log.scrollTop = E.log.scrollHeight;
  };
  const setStatus = (msg) => setText(E.status, msg);

  const applyApiBaseToUI = () => {
    if (E.apiBase) E.apiBase.value = state.apiBase;
  };

  const saveApiBase = () => {
    const value = (E.apiBase?.value || "").trim();
    state.apiBase = value.replace(/\/+$/,"");
    localStorage.setItem("API_BASE", state.apiBase);
    setStatus(`API Base guardada: ${state.apiBase || '(vacía)'}`);
    appendLog(`API Base set: ${state.apiBase}`);
  };

  const resetApiBase = () => {
    localStorage.removeItem("API_BASE");
    state.apiBase = "";
    applyApiBaseToUI();
    setStatus("API Base limpia (usa relativa).");
    appendLog("API Base reset.");
  };

  const apiUrl = (path) => {
    const base = state.apiBase || "";
    if (!base) return path;
    if (path.startsWith("http")) return path;
    return base.replace(/\/+$/,"") + (path.startsWith("/") ? "" : "/") + path;
  };

  const jfetch = async (path, opts = {}) => {
    const url = apiUrl(path);
    const init = {
      method: opts.method || "GET",
      headers: { "Content-Type": "application/json", ...(opts.headers || {}) },
      // If your backend uses session cookies, uncomment:
      // credentials: "include",
    };
    if (opts.body && typeof opts.body !== "string") {
      init.body = JSON.stringify(opts.body);
    } else if (opts.body) {
      init.body = opts.body;
    }
    const res = await fetch(url, init);
    let data = null;
    const ct = res.headers.get("content-type") || "";
    if (ct.includes("application/json")) {
      try { data = await res.json(); } catch (e) { data = null; }
    } else {
      try { data = await res.text(); } catch (e) { data = null; }
    }
    if (!res.ok) {
      const message = (data && (data.error || data.message)) || res.statusText;
      throw new Error(`${res.status} ${message}`);
    }
    return data;
  };

  const healthCheck = async () => {
    try {
      const a = await fetch(apiUrl("/salud")).then(r => r.ok ? r.text() : null).catch(() => null);
      const b = await fetch(apiUrl("/healthz")).then(r => r.ok ? r.text() : null).catch(() => null);
      if (a || b) {
        setStatus("Backend OK (salud/healthz).");
        appendLog("Health OK");
      }
    } catch (e) {
      appendLog("Health check skip.");
    }
  };

  // ---- Session helpers ----
  const setLoggedIn = (email) => {
    state.logged = true;
    state.me = { email };
    if (E.sessionNote) E.sessionNote.textContent = `Sesión iniciada: ${email}`;
  };
  const setLoggedOut = () => {
    state.logged = false;
    state.me = null;
    if (E.sessionNote) E.sessionNote.textContent = `Sesión no iniciada.`;
  };

  // ---- Register & Login (demo) ----
  const doRegister = async () => {
    const email = (E.email?.value || "").trim();
    const password = (E.password?.value || "").trim();
    if (!email || !password) return setStatus("Falta email o contraseña.");

    try {
      // demo backend previously handled POST /api/users
      await jfetch("/api/users", { method: "POST", body: { email, password }});
      setLoggedIn(email);
      setStatus("Registro OK");
      appendLog(`Registered: ${email}`);
    } catch (e) {
      setStatus("Registro falló: " + e.message);
      appendLog(`Register error: ${e.message}`);
    }
  };

  const doLogin = async () => {
    const email = (E.email?.value || "").trim();
    const password = (E.password?.value || "").trim();
    if (!email) return setStatus("Falta email.");

    // As a simple demo, mark logged in locally.
    setLoggedIn(email);
    setStatus("Login OK (local)");
    appendLog(`Login local: ${email}`);
  };

  const doLogout = async () => {
    setLoggedOut();
    setStatus("Sesión cerrada.");
    appendLog("Logout local.");
  };

  // ---- Upload flow (presign -> PUT -> complete) ----

  const tryPresignEndpoints = async (file) => {
    const body = { filename: file.name, type: file.type || "application/octet-stream", size: file.size };

    const endpoints = [
      "/upload/presign",
      "/api/upload/presign",
      "/api/uploads/presign",
      "/uploads/presign"
    ];

    for (const ep of endpoints) {
      try {
        const data = await jfetch(ep, { method: "POST", body });
        // Expect something like: { url, method?, headers?, key?, publicUrl? }
        if (data && (data.url || data.signedUrl)) {
          appendLog(`Presign OK via ${ep}`);
          return { ...data, _endpoint: ep };
        }
      } catch (e) {
        appendLog(`Presign fail ${ep}: ${e.message}`);
      }
    }
    throw new Error("No presign endpoint respondió.");
  };

  const putFile = async (presign, file) => {
    const url = presign.url || presign.signedUrl;
    const method = (presign.method || "PUT").toUpperCase();
    const extraHeaders = presign.headers || {};
    const headers = new Headers(extraHeaders);
    // Content-Type for browsers PUT to R2/S3 presign is usually required
    if (!headers.has("Content-Type") && file.type) headers.set("Content-Type", file.type);

    const res = await fetch(url, { method, headers, body: file });
    if (!res.ok) {
      const txt = await res.text().catch(()=> "");
      appendLog(`PUT error ${res.status}: ${txt.slice(0,200)}`);
      throw new Error(`PUT ${res.status}`);
    }
    // In R2, 200/201 are valid
    return res;
  };

  const completeUpload = async (presign) => {
    const key = presign.key || presign.objectKey || presign.path || null;
    if (!key) return null;

    const payload = { key };
    const endpoints = [
      "/upload/complete",
      "/api/upload/complete",
      "/api/uploads/complete",
      "/uploads/complete"
    ];

    for (const ep of endpoints) {
      try {
        const data = await jfetch(ep, { method: "POST", body: payload });
        appendLog(`Complete OK via ${ep}`);
        return data;
      } catch (e) {
        appendLog(`Complete fail ${ep}: ${e.message}`);
      }
    }
    // If no complete endpoint exists, not fatal for presigned PUT.
    return null;
  };

  const doUpload = async () => {
    try {
      const f = E.file?.files?.[0];
      if (!f) return setStatus("Selecciona un archivo.");
      setStatus("Presign...");
      appendLog(`Iniciando presign: ${f.name} (${f.type||'application/octet-stream'}, ${f.size} bytes)`);

      const presign = await tryPresignEndpoints(f);

      setStatus("Subiendo (PUT)...");
      await putFile(presign, f);

      setStatus("Confirmando (complete)...");
      const done = await completeUpload(presign);

      // Construir URL final
      let finalUrl = presign.publicUrl || null;
      if (!finalUrl && presign.url) {
        try {
          const u = new URL(presign.url);
          u.search = ""; u.hash = "";
          finalUrl = u.toString();
        } catch {}
      }
      setStatus("Listo ✅");
      appendLog("Upload OK");

      if (finalUrl) {
        alert(`Archivo subido.\nURL: ${finalUrl}`);
      } else {
        alert(`Archivo subido.\nkey: ${presign.key || presign.objectKey || '(desconocida)'}`);
      }
    } catch (e) {
      setStatus("Error: " + e.message);
      appendLog("Error: " + e.message);
      alert("Error de red en PUT / presign: " + e.message);
    }
  };

  // ---- Wire UI
  const wire = () => {
    if (E.btnSave) E.btnSave.addEventListener("click", saveApiBase);
    if (E.btnReset) E.btnReset.addEventListener("click", resetApiBase);
    if (E.btnRegister) E.btnRegister.addEventListener("click", doRegister);
    if (E.btnLogin) E.btnLogin.addEventListener("click", doLogin);
    if (E.btnLogout) E.btnLogout.addEventListener("click", doLogout);
    if (E.btnUpload) E.btnUpload.addEventListener("click", doUpload);
  };

  // ---- Init
  const init = async () => {
    applyApiBaseToUI();
    wire();
    if (state.apiBase) setStatus(`Usando API: ${state.apiBase}`);
    await healthCheck();
  };

  document.addEventListener("DOMContentLoaded", init);
})();