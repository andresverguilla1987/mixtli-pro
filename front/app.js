const $ = s => document.querySelector(s);
const LS = "mixtli_api_base";

function apiBase(){ return (localStorage.getItem(LS) || "https://mixtli-pro.onrender.com").replace(/\/$/,""); }
function setBase(v){ localStorage.setItem(LS, v.trim()); }

document.addEventListener("DOMContentLoaded", () => {
  const apiInput = document.getElementById("apiBase");
  apiInput.value = apiBase();
  document.getElementById("saveCfg").onclick = ()=> setBase(apiInput.value);

  document.getElementById("btnUpload").onclick = async () => {
    const f = document.getElementById("file").files[0];
    if(!f) return alert("Elige un archivo");

    try{
      const pres = await fetch(apiBase()+"/upload/presign", {
        method:"POST", headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({ filename: f.name })
      }).then(r => r.json());

      // IMPORTANT: send NO headers. Browser will set its own Content-Type for the Blob,
      // but it's not part of the signature because we didn't sign ContentType.
      const put = await fetch(pres.putUrl, { method:"PUT", body:f, mode:"cors" });
      const txt = await put.text();
      if(!put.ok) throw new Error("PUT "+put.status+"\n"+txt);

      const link = await fetch(apiBase()+"/upload/"+encodeURIComponent(pres.uploadId)+"/link").then(r=>r.json());
      document.getElementById("log").textContent = JSON.stringify({ ok:true, link:link.url }, null, 2);
    }catch(e){
      document.getElementById("log").textContent = e.message;
      alert("Sigue fallando el PUT. Revisa el log debajo.");
    }
  };
});
