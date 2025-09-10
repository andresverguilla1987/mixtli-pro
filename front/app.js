const $ = s => document.querySelector(s);
const LS_KEY = "mixtli_api_base";
function apiBase(){ return (localStorage.getItem(LS_KEY) || "https://mixtli-pro.onrender.com").replace(/\/$/,""); }
function setBase(v){ localStorage.setItem(LS_KEY, v.trim()); }
function log(x){ $("#log").textContent = typeof x === "string" ? x : JSON.stringify(x,null,2); }

document.addEventListener("DOMContentLoaded", () => {
  const apiInput = $("#apiBase");
  apiInput.value = apiBase();
  $("#saveCfg").onclick = ()=>setBase(apiInput.value);

  $("#btnUpload").onclick = async () => {
    const f = $("#file").files[0];
    if(!f) return alert("Elige un archivo");
    try {
      log({ step: "presign:start" });
      const pres = await fetch(apiBase()+"/upload/presign", {
        method:"POST", headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({ filename: f.name })
      });
      const presTxt = await pres.text();
      if(!pres.ok) throw new Error("presign "+pres.status+"\n"+presTxt);
      const j = JSON.parse(presTxt);
      log({ step: "put:start", to: j.putUrl });

      // NO headers; signature didn't include ContentType
      const put = await fetch(j.putUrl, { method:"PUT", body:f, mode:"cors" });
      let putTxt = ""; try { putTxt = await put.text(); } catch {}
      if(!put.ok) throw new Error("put "+put.status+"\n"+putTxt);

      log({ step: "link:start" });
      const link = await fetch(apiBase()+"/upload/"+encodeURIComponent(j.uploadId)+"/link");
      const linkTxt = await link.text();
      if(!link.ok) throw new Error("link "+link.status+"\n"+linkTxt);
      log({ ok: true, link: JSON.parse(linkTxt).url });
    } catch(e){ log({ error: e.message }); }
  };
});
