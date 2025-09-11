// ===== Config =====
const API_BASE = (new URLSearchParams(location.search).get('api') || "https://mixtli-pro.onrender.com").replace(/\/$/,"");
document.addEventListener('DOMContentLoaded', ()=>{
  const apiLabel = document.getElementById('apiLabel'); if(apiLabel) apiLabel.textContent = "API: " + API_BASE;
});

// 🔐 Firebase config (reemplaza con tus valores reales)
const firebaseConfig = {
  apiKey: "TU_API_KEY",
  authDomain: "TU_PROYECTO.firebaseapp.com",
  projectId: "TU_PROYECTO",
  appId: "TU_APP_ID"
};

let auth;
try{
  firebase.initializeApp(firebaseConfig);
  auth = firebase.auth();
} catch(e){
  console.error("Firebase no inicializado:", e);
  // Fallback para que los botones no queden muertos
  auth = {
    currentUser: null,
    async signInWithEmailAndPassword(){ alert("Configura Firebase en index.html/main.js (apiKey, authDomain, projectId, appId) y habilita Email/Password en Firebase Console."); throw new Error("Firebase no configurado"); },
    async createUserWithEmailAndPassword(){ alert("Configura Firebase en index.html/main.js (apiKey, authDomain, projectId, appId) y habilita Email/Password en Firebase Console."); throw new Error("Firebase no configurado"); },
    onAuthStateChanged(cb){ cb(null); },
    signOut(){ /* no-op */ }
  };
}

// ===== Helpers de UI =====
const $ = (id) => document.getElementById(id);
const statusEl = $("status");
const listEl = $("list");
const resultEl = $("result");
const modal = $("modal");
const emailEl = $("email");
const passEl = $("password");
let modalMode = "login"; // login | signup

$("year").textContent = new Date().getFullYear();
$("origin").textContent = window.location.origin;

function setStatus(t){ statusEl.textContent = t }
function toastOK(text, url){
  const id = "f" + Math.random().toString(36).slice(2,8);
  const row = document.createElement("div");
  row.className = "file-row";
  row.innerHTML = \`
    <span class="name">\${text}</span>
    <a class="pill" href="\${url}" target="_blank" rel="noopener">Abrir</a>
    <button class="btn ghost" id="\${id}">Copiar</button>
  \`;
  listEl.prepend(row);
  document.getElementById(id).onclick = async ()=>{ await navigator.clipboard.writeText(url); alert("URL copiada"); };
}
function showPreview(url){
  resultEl.innerHTML = \`
    <div style="margin:8px 0">
      ✅ Enlace listo: <a href="\${url}" target="_blank" rel="noopener">\${url}</a>
      <button id="copyNow" class="btn ghost" style="margin-left:8px">Copiar</button>
    </div>
    <div class="preview"><img src="\${url}" alt="preview"/></div>
  \`;
  $("copyNow").onclick = async ()=>{ await navigator.clipboard.writeText(url); alert("URL copiada"); };
}

// ===== Auth UI =====
function openModal(mode){
  modalMode = mode;
  $("modalTitle").textContent = mode === "login" ? "Entrar" : "Crear cuenta";
  $("modalDesc").textContent = mode === "login" ? "Usa tu correo y contraseña." : "Regístrate con tu correo y una contraseña segura.";
  modal.classList.remove("hidden");
  emailEl.focus();
}
function closeModal(){ modal.classList.add("hidden") }

$("btnLogin").onclick = ()=> openModal("login");
$("btnSignup").onclick = ()=> openModal("signup");
$("modalCancel").onclick = closeModal;

$("modalOk").onclick = async ()=>{
  const email = emailEl.value.trim();
  const pass = passEl.value.trim();
  try{
    if(modalMode === "login") await auth.signInWithEmailAndPassword(email, pass);
    else await auth.createUserWithEmailAndPassword(email, pass);
    closeModal();
  }catch(e){ console.error(e); }
};

auth.onAuthStateChanged(async (user)=>{
  if(user){
    $("authBox").classList.add("hidden");
    $("userBox").classList.remove("hidden");
    $("userName").textContent = user.email;
    $("userAvatar").textContent = (user.email[0] || "?").toUpperCase();
  }else{
    $("authBox").classList.remove("hidden");
    $("userBox").classList.add("hidden");
    $("userName").textContent = "—";
    $("userAvatar").textContent = "?";
  }
});
$("btnLogout").onclick = ()=> auth.signOut();

// ===== Upload =====
async function doPresign(file){
  const token = (await auth.currentUser?.getIdToken?.()) || null;
  const r = await fetch(API_BASE + "/presign", {
    method:"POST",
    headers:{
      "Content-Type":"application/json",
      ...(token ? {"Authorization":"Bearer " + token} : {})
    },
    body: JSON.stringify({ filename:file.name, contentType:file.type, size:file.size })
  });
  if(!r.ok){ throw new Error("Presign " + r.status + " " + await r.text()) }
  return r.json();
}
async function upload(file, presign){
  const r = await fetch(presign.url, { method:"PUT", headers:{"Content-Type":file.type}, body:file });
  if(!r.ok){ throw new Error("PUT " + r.status + " " + r.statusText) }
  return true;
}

const drop = $("drop");
drop.addEventListener("click", ()=> $("file").click());
["dragenter","dragover"].forEach(ev=> drop.addEventListener(ev, e=>{ e.preventDefault(); drop.classList.add("drag") }));
["dragleave","drop"].forEach(ev=> drop.addEventListener(ev, e=>{ e.preventDefault(); drop.classList.remove("drag") }));
drop.addEventListener("drop", async e=>{
  const f = e.dataTransfer.files?.[0]; if(!f) return;
  $("file").files = e.dataTransfer.files;
  await startUpload(f);
});

$("btnUpload").onclick = async ()=>{
  const f = $("file").files[0];
  if(!f) return alert("Selecciona un archivo");
  await startUpload(f);
};

async function startUpload(file){
  resultEl.innerHTML = "";
  setStatus("presign...");
  try{
    const presign = await doPresign(file);
    setStatus("subiendo...");
    await upload(file, presign);
    const link = presign.publicUrl || "https://pub-f411a341ba7f44a28234293891897c59.r2.dev/" + encodeURIComponent(presign.key);
    showPreview(link);
    toastOK(file.name, link);
    setStatus("listo ✅");
  }catch(e){
    setStatus("error ❌");
    alert(e.message);
  }
}
