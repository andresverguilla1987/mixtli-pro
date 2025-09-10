import { API_BASE } from "../assets/config.js";

const qs = (s) => document.querySelector(s);
const log = (m) => {
  const pre = qs("#log");
  pre.textContent += (typeof m === "string" ? m : JSON.stringify(m, null, 2)) + "\n";
  pre.scrollTop = pre.scrollHeight;
};

const apiBaseInput = qs("#apiBase");
apiBaseInput.value = localStorage.getItem("API_BASE") || API_BASE || "";
qs("#saveBase").onclick = () => {
  localStorage.setItem("API_BASE", apiBaseInput.value.trim());
  log("API base guardada.");
};
qs("#resetBase").onclick = () => {
  localStorage.removeItem("API_BASE");
  apiBaseInput.value = API_BASE || "";
  log("API base reseteada al valor por defecto.");
};
const getBase = () => (localStorage.getItem("API_BASE") || API_BASE || "").replace(/\/$/, "");

qs("#btnRegister").onclick = async () => log("Registro (demo) OK");
qs("#btnLogin").onclick = async () => log("Login (demo) OK");
qs("#btnLogout").onclick = async () => log("Logout (demo) OK");

function pickUrl(obj) {
  return obj?.url || obj?.uploadUrl || obj?.presignedUrl || obj?.data?.url || obj?.data?.uploadUrl || obj?.data?.presignedUrl;
}

async function presign(file) {
  const base = getBase();
  const body = { filename: file.name, contentType: file.type || "application/octet-stream", size: file.size };
  const endpoints = [`${base}/upload/presign`, `${base}/presign`];
  let lastErr;
  for (const ep of endpoints) {
    try {
      const res = await fetch(ep, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      if (!res.ok) { lastErr = new Error(`HTTP ${res.status}`); continue; }
      const data = await res.json().catch(() => ({}));
      const url = pickUrl(data);
      if (!url) throw new Error("Falta 'url'/'uploadUrl'/'presignedUrl' en la respuesta");
      return { url, data };
    } catch (e) { lastErr = e; }
  }
  throw lastErr || new Error("No se pudo obtener URL presignada");
}

async function uploadWithPUT(url, file) {
  const res = await fetch(url, {
    method: "PUT",
    headers: { "Content-Type": file.type || "application/octet-stream" },
    body: file
  });
  if (!res.ok && res.status !== 204) {
    const txt = await res.text().catch(() => "");
    throw new Error(`PUT fallo: ${res.status} ${txt}`);
  }
  const etag = res.headers.get("etag");
  return { status: res.status || 200, etag };
}

qs("#btnUpload").onclick = async () => {
  const f = qs("#file").files?.[0];
  if (!f) { alert("Selecciona un archivo"); return; }
  qs("#log").textContent = "";
  try {
    log("Presign...");
    const { url, data } = await presign(f);
    log({ presign: data });
    log("Subiendo...");
    const r = await uploadWithPUT(url, f);
    log({ put: r });
    log("✅ Listo.");
  } catch (e) {
    log("❌ " + e.message);
    console.error(e);
    alert(e.message);
  }
};
