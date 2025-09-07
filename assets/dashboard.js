/* global window, localStorage, supabase */
(() => {
  const cfg = window.CONFIG || { mode: "demo" };
  const bucket = cfg.storageBucket || "files";
  let sb = null;
  if (cfg.mode === "supabase" && cfg.supabaseUrl && cfg.supabaseAnonKey && window.supabase) {
    sb = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey);
  }

  // Elements
  const userEmailEl = document.getElementById("userEmail");
  const logoutBtn = document.getElementById("logoutBtn");
  const uploadBtn = document.getElementById("uploadBtn");
  const uploadMsg = document.getElementById("uploadMsg");
  const fileList = document.getElementById("fileList");
  const fileGrid = document.getElementById("fileGrid");
  const listBtn = document.getElementById("listBtn");
  const gridBtn = document.getElementById("gridBtn");
  const searchInput = document.getElementById("searchInput");
  const typeFilter = document.getElementById("typeFilter");
  const sortBy = document.getElementById("sortBy");
  const sizeRange = document.getElementById("sizeRange");
  const tagInput = document.getElementById("tagInput");
  const tagFilter = document.getElementById("tagFilter");
  const shareWithExpiryBtn = document.getElementById("shareWithExpiry");
  const moveToFolderBtn = document.getElementById("moveToFolder");
  const selCount = document.getElementById("selCount");
  const currentFolderLabel = document.getElementById("currentFolderLabel");
  const currentAlbumLabel = document.getElementById("currentAlbumLabel");
  const bulkCopy = document.getElementById("bulkCopy");
  const bulkDelete = document.getElementById("bulkDelete");

  // Folders
  const folderTree = document.getElementById("folderTree");
  const newFolderBtn = document.getElementById("newFolder");
  const renameFolderBtn = document.getElementById("renameFolder");
  let currentPrefix = ""; // relative to uid, e.g. "", "Fotos/", "Fotos/2024/"

  // Albums
  const albumList = document.getElementById("albumList");
  const newAlbumBtn = document.getElementById("newAlbum");
  const renameAlbumBtn = document.getElementById("renameAlbum");
  const deleteAlbumBtn = document.getElementById("deleteAlbum");
  const setAlbumCoverBtn = document.getElementById("setAlbumCover");
  const addToAlbumBtn = document.getElementById("addToAlbum");
  const removeFromAlbumBtn = document.getElementById("removeFromAlbum");
  const shareAlbumBtn = document.getElementById("shareAlbum");

  // Lightbox
  const lightbox = document.getElementById("lightbox");
  const stage = document.getElementById("lightboxStage");
  const caption = document.getElementById("lightboxCaption");
  const btnClose = document.getElementById("btnClose");
  const btnPrev = document.getElementById("btnPrev");
  const btnNext = document.getElementById("btnNext");
  const btnZoomIn = document.getElementById("btnZoomIn");
  const btnZoomOut = document.getElementById("btnZoomOut");
  const btnZoomReset = document.getElementById("btnZoomReset");
  const btnDownload = document.getElementById("btnDownload");
  const btnShare = document.getElementById("btnShare");

  // State
  let view = "grid";
  let user = null;
  let allItems = []; // {name,path,url,type,createdAt,size,tags[],prefix}
  let filteredIdx = [];
  let selected = new Set();
  let albums = []; // {id,name,cover_path,created_at}
  let albumItems = new Map(); // albumId -> Set(paths)
  let tagsSet = new Set();
  let currentIndex = -1;
  let scale = 1, offsetX = 0, offsetY = 0;
  let dragging = false, lastX = 0, lastY = 0;

  // Helpers
  function toast(msg){ uploadMsg.textContent = msg; setTimeout(()=>{ if(uploadMsg.textContent===msg) uploadMsg.textContent=""; }, 1800); }
  function extOf(name){ const i = name.lastIndexOf("."); return i>=0?name.substring(i+1).toLowerCase():""; }
  function isImage(e){ return ["png","jpg","jpeg","gif","webp","svg"].includes(e); }
  function isVideo(e){ return ["mp4","webm","ogg"].includes(e); }
  function isPdf(e){ return e === "pdf"; }
  function typeFromExt(e){ return isImage(e)?"image":isVideo(e)?"video":isPdf(e)?"pdf":"other"; }
  function bytesToSize(bytes){ if (!bytes&&bytes!==0) return ""; const u=["B","KB","MB","GB"]; let i=0,v=bytes; while(v>=1024&&i<u.length-1){v/=1024;i++;} return v.toFixed(1)+" "+u[i]; }
  function joinPath(a,b){ if(!a) return b; if(!a.endsWith("/")) a+="/"; return a+b; }
  function parentOf(p){ const parts=p.split("/"); parts.pop(); return parts.join("/")+"/"; }

  // UI toggles
  listBtn.addEventListener("click", ()=>{ view="list"; render(); });
  gridBtn.addEventListener("click", ()=>{ view="grid"; render(); });
  searchInput.addEventListener("input", render);
  typeFilter.addEventListener("change", render);
  sortBy.addEventListener("change", render);
  sizeRange.addEventListener("input", ()=>{ document.documentElement.style.setProperty('--thumb-h', sizeRange.value+'px'); });
  tagFilter.addEventListener("change", render);
  tagInput.addEventListener("keydown", async (e)=>{
    if(e.key === "Enter"){
      e.preventDefault();
      if(!selected.size){ toast("Selecciona archivos para etiquetar"); return; }
      const t = (tagInput.value || "").trim();
      if(!t) return;
      await addTagsToSelection(t);
      tagInput.value = "";
    }
  });

  // Session
  async function getSession(){
    if (sb){ const { data } = await sb.auth.getUser(); return data?.user || null; }
    const s = JSON.parse(localStorage.getItem("mx_session") || "null");
    return s ? { email:s.email, id:"demo-user" } : null;
  }

  // Load/Save tags (Supabase/local)
  async function loadTags(){
    tagsSet.clear();
    if (sb){
      const { data, error } = await sb.from("file_tags").select("path, tag").eq("user_id", user.id);
      if (!error && data){
        for (const row of data){ tagsSet.add(row.tag); const it = allItems.find(x=>x.path===row.path); if (it){ (it.tags ||= []).push(row.tag); } }
      }
    } else {
      const store = JSON.parse(localStorage.getItem("mx_tags") || "{}"); // {path:[tag,..]}
      for (const p of Object.keys(store)){
        for (const t of store[p]){ tagsSet.add(t); const it = allItems.find(x=>x.path===p); if (it){ (it.tags ||= []).push(t); } }
      }
    }
    refreshTagFilter();
  }

  function refreshTagFilter(){
    const cur = tagFilter.value;
    tagFilter.innerHTML = '<option value="">Tag (todos)</option>';
    Array.from(tagsSet).sort().forEach(t=>{
      const opt = document.createElement("option"); opt.value = t; opt.textContent = t;
      tagFilter.appendChild(opt);
    });
    tagFilter.value = cur || "";
  }

  async function addTagsToSelection(tag){
    if (sb){
      const rows = Array.from(selected).map(p=>({ user_id:user.id, path:p, tag }));
      const { error } = await sb.from("file_tags").upsert(rows, { onConflict: "user_id,path,tag" });
      if (error){ toast(error.message); return; }
    } else {
      const store = JSON.parse(localStorage.getItem("mx_tags") || "{}");
      for (const p of selected){
        const arr = store[p] || []; if (!arr.includes(tag)) arr.push(tag); store[p]=arr;
      }
      localStorage.setItem("mx_tags", JSON.stringify(store));
    }
    for (const p of selected){
      const it = allItems.find(x=>x.path===p); if (it){ (it.tags ||= []).push(tag); }
    }
    tagsSet.add(tag); refreshTagFilter(); render(); toast("Tag añadido");
  }

  // Build folder tree from allItems prefixes
  function buildFolderTree(){
    const root = { name: "/", children: {}, path:"" };
    for (const it of allItems){
      const rel = it.path.split("/").slice(1).join("/"); // remove uid/
      const parts = rel.split("/"); parts.pop(); // remove filename
      let node = root; let accum = "";
      for (const seg of parts){
        if (!seg) continue;
        accum = joinPath(accum, seg);
        node.children[seg] = node.children[seg] || { name: seg, children: {}, path: accum };
        node = node.children[seg];
      }
    }
    // render
    folderTree.innerHTML = "";
    const mk = (node, depth=0)=>{
      const li = document.createElement("li");
      li.className = "px-2 py-1 rounded-md cursor-pointer hover:bg-white/10 flex items-center justify-between";
      li.style.paddingLeft = (8 + depth*12) + "px";
      li.textContent = node.name === "/" ? "(raíz)" : node.name;
      li.addEventListener("click", ()=>{ currentPrefix = node.path ? (node.path.endsWith("/")?node.path:node.path+"/") : ""; currentFolderLabel.textContent = "/" + currentPrefix; render(); });
      const count = document.createElement("span"); count.className="text-xs text-slate-400"; count.textContent = countFilesInPrefix(node.path?node.path+"/":"");
      li.appendChild(count);
      folderTree.appendChild(li);
      const keys = Object.keys(node.children).sort();
      for (const k of keys) mk(node.children[k], depth+1);
    };
    mk(root, 0);
  }
  function countFilesInPrefix(prefix){
    let n=0; for (const it of allItems){ if (!prefix || it.prefix.startsWith(prefix)) n++; } return String(n);
  }

  // Render items according to filters/album/folder
  function render(){
    const q=(searchInput.value||"").toLowerCase().trim();
    const t=typeFilter.value; const tg=tagFilter.value;
    filteredIdx=[];
    // album filter
    const activeAlbum = selectedAlbumId==="all" ? null : (albumItems.get(selectedAlbumId) || new Set());
    for (let i=0;i<allItems.length;i++){
      const it=allItems[i];
      if (currentPrefix && !it.prefix.startsWith(currentPrefix)) continue;
      if (activeAlbum && !activeAlbum.has(it.path)) continue;
      if (t!=="all" && it.type!==t) continue;
      if (tg && !(it.tags||[]).includes(tg)) continue;
      if (q && !it.name.toLowerCase().includes(q)) continue;
      filteredIdx.push(i);
    }
    if (sortBy.value==="name"){ filteredIdx.sort((a,b)=> allItems[a].name.localeCompare(allItems[b].name)); }
    else { filteredIdx.sort((a,b)=> new Date(allItems[b].createdAt||0)-new Date(allItems[a].createdAt||0)); }

    // draw
    fileList.innerHTML=""; fileGrid.innerHTML="";
    if (view==="list"){
      fileList.classList.remove("hidden"); fileGrid.classList.add("hidden");
      filteredIdx.forEach(idx=> fileList.appendChild(listRow(allItems[idx], idx)));
    } else {
      fileList.classList.add("hidden"); fileGrid.classList.remove("hidden");
      filteredIdx.forEach(idx=> fileGrid.appendChild(gridCard(allItems[idx], idx)));
    }
    selCount.textContent = String(selected.size);
  }

  function checkbox(el, path){
    const cb=document.createElement("input"); cb.type="checkbox"; cb.className="accent-brand-500";
    cb.checked = selected.has(path);
    cb.addEventListener("change", ()=>{ if(cb.checked) selected.add(path); else selected.delete(path); selCount.textContent=String(selected.size); });
    el.prepend(cb);
  }

  function listRow(item, index){
    const li=document.createElement("li"); li.className="rounded-md border border-white/10 bg-white/5 p-3 flex items-center justify-between gap-3";
    const left=document.createElement("div"); left.className="flex items-center gap-3 min-w-0";
    const titleBtn=document.createElement("button"); titleBtn.className="truncate text-left hover:underline"; titleBtn.textContent=item.name; titleBtn.addEventListener("click",()=>openLightbox(index));
    left.appendChild(titleBtn); checkbox(left, item.path);
    const tags = buildTagChips(item);
    const right=document.createElement("div"); right.className="flex items-center gap-2 text-xs text-slate-400";
    const sizeSpan=document.createElement("span"); sizeSpan.textContent=item.size?bytesToSize(item.size):"";
    const openA=document.createElement("a"); openA.className="px-2 py-1 rounded-md bg-white/10 hover:bg-white/20 text-slate-200"; openA.textContent="Abrir"; openA.href=item.url||"#"; openA.target="_blank";
    const moveB=document.createElement("button"); moveB.className="px-2 py-1 rounded-md bg-white/10 hover:bg-white/20 text-slate-200"; moveB.textContent="Mover"; moveB.addEventListener("click",()=>promptMove([item.path]));
    const copyB=document.createElement("button"); copyB.className="px-2 py-1 rounded-md bg-white/10 hover:bg-white/20 text-slate-200"; copyB.textContent="Copiar"; copyB.addEventListener("click",async()=>{ try{ await navigator.clipboard.writeText(item.url||item.path); toast("Link copiado"); }catch(e){ toast("No se pudo copiar"); }});
    const delB=document.createElement("button"); delB.className="px-2 py-1 rounded-md bg-white/10 hover:bg-white/20 text-red-300"; delB.textContent="Borrar"; delB.addEventListener("click",async()=>{ await deleteOne(item.path); });
    right.append(tags,sizeSpan,openA,moveB,copyB,delB);
    li.append(left,right);
    // drag support
    li.draggable = true;
    li.ondragstart = (e)=> e.dataTransfer.setData("text/plain", item.path);
    return li;
  }

  function gridCard(item, index){
    const card=document.createElement("div"); card.className="card rounded-lg border border-white/10 bg-white/5 p-3 space-y-2 group";
    const top=document.createElement("div"); top.className="flex items-center justify-between";
    const name=document.createElement("div"); name.className="truncate text-sm"; name.textContent=item.name;
    const badge=document.createElement("span"); badge.className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 border border-white/10 text-slate-300"; badge.textContent=item.type.toUpperCase();
    top.append(name,badge);
    const thumb=document.createElement("div"); thumb.className="thumb rounded-md overflow-hidden bg-black/30 cursor-zoom-in";
    const ext=extOf(item.name);
    if(isImage(ext)){ const img=document.createElement("img"); img.src=item.url||"#"; img.alt=item.name; thumb.appendChild(img); }
    else if(isVideo(ext)){ const v=document.createElement("video"); v.src=item.url||"#"; v.controls=false; v.preload="metadata"; v.muted=true; thumb.appendChild(v); }
    else if(isPdf(ext)){ const div=document.createElement("div"); div.className="w-full h-[var(--thumb-h)] grid place-items-center text-xs text-slate-300"; div.textContent="PDF"; thumb.appendChild(div); }
    else { const div=document.createElement("div"); div.className="w-full h-[var(--thumb-h)] grid place-items-center text-xs text-slate-300"; div.textContent=(ext||"FILE").toUpperCase(); thumb.appendChild(div); }
    thumb.addEventListener("click",()=>openLightbox(index));

    const actions=document.createElement("div"); actions.className="flex items-center justify-between gap-2 text-xs text-slate-400";
    const left=document.createElement("div"); left.className="flex items-center gap-2"; const sizeSpan=document.createElement("span"); sizeSpan.textContent=item.size?bytesToSize(item.size):""; left.append(sizeSpan); checkbox(left, item.path);
    const right=document.createElement("div"); right.className="flex items-center gap-2";
    const openA=document.createElement("a"); openA.className="px-2 py-1 rounded-md bg-white/10 hover:bg-white/20 text-slate-200"; openA.textContent="Abrir"; openA.href=item.url||"#"; openA.target="_blank";
    const moveB=document.createElement("button"); moveB.className="px-2 py-1 rounded-md bg-white/10 hover:bg-white/20 text-slate-200"; moveB.textContent="Mover"; moveB.addEventListener("click",()=>promptMove([item.path]));
    const copyB=document.createElement("button"); copyB.className="px-2 py-1 rounded-md bg-white/10 hover:bg-white/20 text-slate-200"; copyB.textContent="Copiar"; copyB.addEventListener("click",async()=>{ try{ await navigator.clipboard.writeText(item.url||item.path); toast("Link copiado"); }catch(e){ toast("No se pudo copiar"); }});
    const delB=document.createElement("button"); delB.className="px-2 py-1 rounded-md bg-white/10 hover:bg-white/20 text-red-300"; delB.textContent="Borrar"; delB.addEventListener("click",async()=>{ await deleteOne(item.path); });
    right.append(openA,moveB,copyB,delB);
    actions.append(left,right);

    // tags line
    const tags = buildTagChips(item);

    card.append(top,thumb,actions,tags);
    // drag
    card.draggable = true;
    card.ondragstart = (e)=> e.dataTransfer.setData("text/plain", item.path);
    return card;
  }

  function buildTagChips(item){
    const wrap=document.createElement("div"); wrap.className="flex flex-wrap gap-1";
    (item.tags||[]).forEach(t=>{
      const b=document.createElement("span"); b.className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 border border-white/10 text-slate-300"; b.textContent=t; wrap.appendChild(b);
    });
    return wrap;
  }

  // Folder operations
  newFolderBtn.addEventListener("click", async ()=>{
    const name = prompt("Nombre de carpeta (sin /):","Nueva");
    if (!name) return;
    const newPref = joinPath(currentPrefix, name) + "/";
    // create by uploading 0-byte placeholder (Storage no necesita, pero dejamos carpeta visible en demo)
    if (sb){
      // no-op; se crea implícitamente al mover/subir
      toast("Carpeta creada");
    } else {
      const folders = JSON.parse(localStorage.getItem("mx_folders")||"{}");
      const uid = user.id || "demo-user";
      const list = folders[uid]||[];
      if (!list.includes(newPref)) list.push(newPref);
      folders[uid]=list; localStorage.setItem("mx_folders", JSON.stringify(folders));
    }
    buildFolderTree();
  });

  renameFolderBtn.addEventListener("click", async ()=>{
    if (!currentPrefix){ toast("Selecciona una carpeta distinta de raíz"); return; }
    const base = currentPrefix.endsWith("/")? currentPrefix.slice(0,-1): currentPrefix;
    const parent = parentOf(base);
    const newName = prompt("Nuevo nombre de carpeta:", base.split("/").pop());
    if (!newName) return;
    const newPref = (parent||"") + newName + "/";
    // Move all files under currentPrefix to newPref
    const affected = allItems.filter(it=> it.prefix.startsWith(currentPrefix));
    for (const it of affected){
      const newPath = user.id + "/" + newPref + it.name;
      await movePath(it.path, newPath);
      it.path = newPath; it.prefix = newPref;
    }
    currentPrefix = newPref; currentFolderLabel.textContent = "/" + currentPrefix;
    await refreshSignedUrls(); buildFolderTree(); render();
    toast("Carpeta renombrada");
  });

  moveToFolderBtn.addEventListener("click", async ()=>{
    if (!selected.size){ toast("Selecciona archivos"); return; }
    const target = prompt("Mover a carpeta (ruta relativa, p.ej. Fotos/2024):", currentPrefix);
    if (target === null) return;
    const targetPref = (target? (target.endsWith("/")? target : target+"/") : "");
    for (const p of Array.from(selected)){
      const it = allItems.find(x=>x.path===p); if (!it) continue;
      const newPath = user.id + "/" + targetPref + it.name;
      await movePath(it.path, newPath);
      it.path = newPath; it.prefix = targetPref;
    }
    await refreshSignedUrls(); buildFolderTree(); render();
    toast("Movidos");
  });

  async function movePath(from, to){
    if (sb){
      try {
        const { error } = await sb.storage.from(bucket).move(from, to);
        if (error) throw error;
      } catch(e){
        // fallback: not implemented in demo
      }
    } else {
      // demo: update local store
      const items = JSON.parse(localStorage.getItem("mx_files") || "[]");
      const it = items.find(x=>x.path===from);
      if (it){ it.path = to; }
      localStorage.setItem("mx_files", JSON.stringify(items));
    }
  }

  // Drag & drop to folder tree
  folderTree.addEventListener("dragover", e=>{ e.preventDefault(); });
  folderTree.addEventListener("drop", async (e)=>{
    e.preventDefault();
    const path = e.dataTransfer.getData("text/plain");
    const targetName = prompt("Mover a (carpeta relativa):", currentPrefix);
    if (targetName===null) return;
    const pref = (targetName && !targetName.endsWith("/")) ? (targetName+"/") : (targetName||"");
    const it = allItems.find(x=>x.path===path);
    if (!it) return;
    const newPath = user.id + "/" + pref + it.name;
    await movePath(it.path, newPath);
    it.path = newPath; it.prefix = pref;
    await refreshSignedUrls(); buildFolderTree(); render();
    toast("Movido");
  });

  // Albums
  let selectedAlbumId = "all";
  newAlbumBtn.addEventListener("click", createAlbum);
  renameAlbumBtn.addEventListener("click", renameAlbum);
  deleteAlbumBtn.addEventListener("click", deleteAlbum);
  setAlbumCoverBtn.addEventListener("click", setAlbumCover);
  addToAlbumBtn.addEventListener("click", addToAlbum);
  removeFromAlbumBtn.addEventListener("click", removeFromAlbum);
  shareAlbumBtn.addEventListener("click", shareAlbum);

  function renderAlbums(){
    albumList.innerHTML="";
    const mk = (id,name,cover)=>{
      const li=document.createElement("li"); li.className="flex items-center justify-between gap-2 px-2 py-1 rounded-md cursor-pointer hover:bg-white/10 " + (id===selectedAlbumId?"bg-white/10":"");
      li.addEventListener("click",()=>{ selectedAlbumId=id; currentAlbumLabel.textContent = id==="all"?"Todos":name; render(); });
      const left=document.createElement("div"); left.className="flex items-center gap-2 truncate";
      if (cover){ const dot=document.createElement("span"); dot.className="inline-block w-2.5 h-2.5 rounded-full bg-brand-500"; left.appendChild(dot); }
      const t=document.createElement("span"); t.className="truncate"; t.textContent = id==="all"?"Todos":name; left.appendChild(t);
      const count=document.createElement("span"); count.className="text-xs text-slate-400";
      count.textContent = id==="all"? String(allItems.length) : String(albumItems.get(id)?.size || 0);
      li.append(left,count); albumList.appendChild(li);
    };
    mk("all","Todos", false);
    for (const a of albums){ mk(a.id, a.name, !!a.cover_path); }
  }

  async function createAlbum(){
    const name = prompt("Nombre del álbum:","Mi colección");
    if (!name) return;
    const id = (crypto && crypto.randomUUID) ? crypto.randomUUID() : String(Date.now());
    const rec = { id, name, created_at: new Date().toISOString(), cover_path: null };
    albums.push(rec); albumItems.set(id, new Set());
    if (sb){
      const { error } = await sb.from("albums").insert({ id, name, user_id: user.id, cover_path: null });
      if (error){ toast(error.message); return; }
    } else {
      persistAlbumsLocal();
    }
    selectedAlbumId = id; renderAlbums(); render();
  }

  async function renameAlbum(){
    if (selectedAlbumId==="all"){ toast("Selecciona un álbum"); return; }
    const a = albums.find(x=>x.id===selectedAlbumId); if (!a) return;
    const name = prompt("Nuevo nombre:", a.name); if (!name) return;
    a.name = name;
    if (sb){
      const { error } = await sb.from("albums").update({ name }).eq("id", a.id);
      if (error){ toast(error.message); return; }
    } else { persistAlbumsLocal(); }
    renderAlbums();
  }

  async function deleteAlbum(){
    if (selectedAlbumId==="all"){ toast("No puedes borrar 'Todos'"); return; }
    if(!confirm("¿Borrar álbum? (no borra archivos)")) return;
    const id = selectedAlbumId;
    albums = albums.filter(x=>x.id!==id); albumItems.delete(id);
    if (sb){ await sb.from("albums").delete().eq("id", id); await sb.from("album_items").delete().eq("album_id", id); }
    else { persistAlbumsLocal(); }
    selectedAlbumId = "all"; renderAlbums(); render();
  }

  async function setAlbumCover(){
    if (selectedAlbumId==="all"){ toast("Selecciona un álbum"); return; }
    if (!selected.size){ toast("Selecciona una imagen como portada"); return; }
    const any = Array.from(selected)[0];
    const it = allItems.find(x=>x.path===any);
    if (!it || it.type!=="image"){ toast("Elige una imagen"); return; }
    const a = albums.find(x=>x.id===selectedAlbumId); if (!a) return;
    a.cover_path = it.path;
    if (sb){ await sb.from("albums").update({ cover_path: it.path }).eq("id", a.id); } else { persistAlbumsLocal(); }
    renderAlbums(); toast("Portada actualizada");
  }

  async function addToAlbum(){
    if (!selected.size){ toast("Selecciona archivos"); return; }
    let targetId = selectedAlbumId;
    if (targetId==="all"){
      const name = prompt("Añadir a álbum (nombre existente o nuevo):","Mi colección"); if (!name) return;
      let target = albums.find(a=>a.name.toLowerCase()===name.toLowerCase());
      if (!target){
        const id = (crypto && crypto.randomUUID) ? crypto.randomUUID() : String(Date.now());
        const rec = { id, name, created_at: new Date().toISOString(), cover_path:null };
        albums.push(rec); albumItems.set(id, new Set());
        if (sb){ await sb.from("albums").insert({ id, name, user_id:user.id }); } else { persistAlbumsLocal(); }
        target = rec;
      }
      targetId = target.id; selectedAlbumId = targetId;
    }
    const set = albumItems.get(targetId) || new Set();
    const arr = Array.from(selected);
    arr.forEach(p=>set.add(p));
    albumItems.set(targetId, set);
    if (sb){
      const rows = arr.map(p=>({ album_id: targetId, path: p, name: (allItems.find(i=>i.path===p)?.name)||p.split("/").pop() }));
      await sb.from("album_items").upsert(rows, { onConflict:"album_id,path" });
    } else { persistAlbumsLocal(); }
    render(); toast("Añadido");
  }

  async function removeFromAlbum(){
    if (selectedAlbumId==="all"){ toast("Selecciona un álbum"); return; }
    if (!selected.size){ toast("Selecciona archivos"); return; }
    const id = selectedAlbumId; const set = albumItems.get(id)||new Set();
    const arr = Array.from(selected); arr.forEach(p=> set.delete(p));
    albumItems.set(id, set);
    if (sb){ await sb.from("album_items").delete().in("path", arr).eq("album_id", id); } else { persistAlbumsLocal(); }
    render(); toast("Quitado");
  }

  async function shareAlbum(){
    const id = selectedAlbumId;
    const paths = id==="all" ? allItems.map(i=>i.path) : Array.from(albumItems.get(id)||[]);
    if (!paths.length){ toast("Álbum vacío"); return; }
    const exp = await promptExpirySeconds(); if (exp==null) return;
    const links = await signedLinks(paths, exp);
    try { await navigator.clipboard.writeText(links.join("\n")); toast("Links copiados"); }
    catch(e){ toast("No se pudo copiar"); }
  }

  function persistAlbumsLocal(){
    localStorage.setItem("mx_albums_v5", JSON.stringify(albums));
    const obj={}; for (const [k,set] of albumItems.entries()){ obj[k]=Array.from(set); }
    localStorage.setItem("mx_album_items_v5", JSON.stringify(obj));
  }

  async function loadAlbums(){
    if (sb){
      const a = await sb.from("albums").select("*").order("created_at",{ascending:true});
      albums = a.data||[];
      for (const al of albums){
        const it = await sb.from("album_items").select("path").eq("album_id", al.id);
        albumItems.set(al.id, new Set((it.data||[]).map(x=>x.path)));
      }
    } else {
      albums = JSON.parse(localStorage.getItem("mx_albums_v5")||"[]");
      const m = JSON.parse(localStorage.getItem("mx_album_items_v5")||"{}");
      albumItems = new Map(Object.entries(m).map(([k,v])=>[k,new Set(v)]));
    }
    renderAlbums();
  }

  // Signed links with expiry
  shareWithExpiryBtn.addEventListener("click", async ()=>{
    if (!selected.size){ toast("Selecciona archivos"); return; }
    const exp = await promptExpirySeconds(); if (exp==null) return;
    const links = await signedLinks(Array.from(selected), exp);
    try { await navigator.clipboard.writeText(links.join("\n")); toast("Links copiados"); }
    catch(e){ toast("No se pudo copiar"); }
  });

  async function promptExpirySeconds(){
    const choice = prompt("Expira en: 15m, 1h, 24h, 7d","24h");
    if (!choice) return null;
    const map = { "15m": 15*60, "1h": 3600, "24h": 24*3600, "7d": 7*24*3600 };
    return map[choice.toLowerCase()] ?? 24*3600;
  }

  async function signedLinks(paths, exp){
    const out=[];
    if (sb){
      for (const p of paths){
        try {
          const r = await sb.storage.from(bucket).createSignedUrl(p, exp);
          out.push(r.data?.signedUrl || p);
        } catch(e){ out.push(p); }
      }
    } else {
      for (const p of paths){
        const it = allItems.find(x=>x.path===p); out.push(it?.url || p);
      }
    }
    return out;
  }

  // Copy / Delete
  bulkCopy.addEventListener("click", async ()=>{
    if (!selected.size){ toast("No hay seleccionados"); return; }
    const links = await signedLinks(Array.from(selected), 3600);
    try { await navigator.clipboard.writeText(links.join("\n")); toast("Links copiados"); }
    catch(e){ toast("No se pudo copiar"); }
  });
  bulkDelete.addEventListener("click", async ()=>{
    if (!selected.size){ toast("No hay seleccionados"); return; }
    if (!confirm("¿Borrar seleccionados?")) return;
    for (const p of Array.from(selected)) await deleteOne(p);
    selected.clear(); selCount.textContent="0"; render();
  });

  // Delete file helper
  async function deleteOne(path){
    if (sb){
      const { error } = await sb.storage.from(bucket).remove([path]);
      if (error){ toast(error.message); return; }
      await sb.from("album_items").delete().eq("path", path);
      await sb.from("file_tags").delete().eq("path", path).eq("user_id", user.id);
    } else {
      const items = JSON.parse(localStorage.getItem("mx_files")||"[]").filter(it=>it.path!==path);
      localStorage.setItem("mx_files", JSON.stringify(items));
      const tags = JSON.parse(localStorage.getItem("mx_tags")||"{}"); delete tags[path]; localStorage.setItem("mx_tags", JSON.stringify(tags));
      for (const [k,set] of albumItems.entries()){ if (set.has(path)) set.delete(path); }
      persistAlbumsLocal();
    }
    allItems = allItems.filter(i=>i.path!==path);
  }

  // Upload
  uploadBtn.addEventListener("click", async ()=>{
    const files = document.getElementById("fileInput").files;
    if (!files || !files.length){ toast("Selecciona archivos"); return; }
    for (const f of files){
      uploadMsg.textContent = "Subiendo " + f.name + "...";
      const filename = `${Date.now()}_${f.name}`;
      const path = user.id + "/" + (currentPrefix||"") + filename;
      try {
        if (sb){
          const { error } = await sb.storage.from(bucket).upload(path, f, { upsert:true, cacheControl:"3600" });
          if (error) throw error;
        } else {
          const items = JSON.parse(localStorage.getItem("mx_files")||"[]");
          const previewUrl = URL.createObjectURL(f);
          items.push({ name: filename, size: f.size, path, previewUrl, at: Date.now() });
          localStorage.setItem("mx_files", JSON.stringify(items));
        }
      } catch(e){ toast(e.message || ("Error al subir "+f.name)); return; }
    }
    uploadMsg.textContent = "Subidas completadas ✔";
    await listFiles();
  });

  // List files + helpers
  async function refreshSignedUrls(){
    if (!sb) return;
    for (const it of allItems){
      try { const r = await sb.storage.from(bucket).createSignedUrl(it.path, 3600); it.url = r.data?.signedUrl || ""; } catch(e){}
    }
  }

  async function listFiles(){
    allItems = [];
    if (sb){
      const uid = user.id;
      const { data, error } = await sb.storage.from(bucket).list(uid, { limit: 1000, sortBy:{column:"created_at",order:"desc"} });
      if (error){ toast(error.message); return; }
      for (const item of data||[]){
        const path = `${uid}/${item.name}`;
        const ext = extOf(item.name);
        const t = typeFromExt(ext);
        const prefix = item.name.includes("/") ? item.name.split("/").slice(0,-1).join("/") + "/" : "";
        let url=""; try{ const r = await sb.storage.from(bucket).createSignedUrl(path, 3600); url=r.data?.signedUrl||""; } catch(e){}
        allItems.push({ name:item.name.split("/").pop(), path, url, type:t, createdAt:item.created_at||item.updated_at||null, size:null, tags:[], prefix });
      }
    } else {
      const items = JSON.parse(localStorage.getItem("mx_files")||"[]").reverse();
      for (const it of items){
        const ext = extOf(it.name); const t = typeFromExt(ext);
        const rel = it.path.split("/").slice(1).join("/");
        const prefix = rel.includes("/") ? rel.split("/").slice(0,-1).join("/") + "/" : "";
        allItems.push({ name:it.name.split("/").pop(), path:it.path, url:it.previewUrl||"#", type:t, createdAt:new Date(it.at||Date.now()).toISOString(), size:it.size||null, tags:[], prefix });
      }
    }
    await loadTags();
    buildFolderTree();
    render();
  }

  // Lightbox
  function resetTransform(){ scale=1; offsetX=0; offsetY=0; }
  function setTransform(el){ el.style.transform = `translate(${offsetX}px, ${offsetY}px) scale(${scale})`; }
  function renderLightboxContent(item){
    stage.innerHTML="";
    const wrap=document.createElement("div"); wrap.className="max-w-[90vw] max-h-[80vh] overflow-hidden";
    const el=document.createElement(item.type==="video"?"video":(item.type==="pdf"?"iframe":"img"));
    el.draggable=false;
    if (item.type==="image"){ el.src=item.url; el.alt=item.name; el.style.maxWidth="90vw"; el.style.maxHeight="80vh"; }
    else if (item.type==="video"){ el.src=item.url; el.controls=true; el.style.maxWidth="90vw"; el.style.maxHeight="80vh"; }
    else if (item.type==="pdf"){ el.src=item.url; el.style.width="90vw"; el.style.height="80vh"; }
    else { const div=document.createElement("div"); div.className="text-slate-200"; div.innerHTML=`<div class="text-center">Sin vista previa. <a class="underline" href="${item.url}" target="_blank">Abrir</a></div>`; wrap.appendChild(div); stage.appendChild(wrap); return; }
    el.style.transition="transform 0.05s linear"; el.style.transformOrigin="center center";
    wrap.appendChild(el); stage.appendChild(wrap);
    btnDownload.href = item.url + (item.url.includes("?")?"&":"?") + "download=" + encodeURIComponent(item.name);
    btnShare.onclick = async ()=>{ try{ await navigator.clipboard.writeText(item.url); toast("Link copiado"); }catch(e){ toast("No se pudo copiar"); } };
    stage.onwheel = (e)=>{ e.preventDefault(); const d=e.deltaY>0?-0.1:0.1; scale=Math.max(0.25,Math.min(6,scale+d)); setTransform(el); };
    stage.onmousedown = (e)=>{ dragging=true; lastX=e.clientX; lastY=e.clientY; stage.style.cursor="grabbing"; };
    window.onmouseup = ()=>{ dragging=false; stage.style.cursor="grab"; };
    window.onmousemove = (e)=>{ if(!dragging) return; offsetX+=(e.clientX-lastX); offsetY+=(e.clientY-lastY); lastX=e.clientX; lastY=e.clientY; setTransform(el); };
    stage.ondblclick = ()=>{ resetTransform(); setTransform(el); };
  }
  function openLightbox(index){
    currentIndex=index; resetTransform();
    const idx=filteredIdx.indexOf(index);
    const item=allItems[index];
    renderLightboxContent(item);
    caption.textContent = item.name + " (" + (idx+1) + "/" + filteredIdx.length + ")";
    lightbox.classList.remove("hidden"); document.body.classList.add("overflow-hidden");
  }
  function closeLightbox(){ lightbox.classList.add("hidden"); document.body.classList.remove("overflow-hidden"); stage.innerHTML=""; }
  function nextItem(){ if(!filteredIdx.length) return; const i=filteredIdx.indexOf(currentIndex); const ni=filteredIdx[(i+1)%filteredIdx.length]; openLightbox(ni); }
  function prevItem(){ if(!filteredIdx.length) return; const i=filteredIdx.indexOf(currentIndex); const pi=filteredIdx[(i-1+filteredIdx.length)%filteredIdx.length]; openLightbox(pi); }

  btnClose.addEventListener("click", closeLightbox);
  btnNext.addEventListener("click", nextItem);
  btnPrev.addEventListener("click", prevItem);
  btnZoomIn.addEventListener("click", ()=>{ scale=Math.min(6,scale+0.2); const el=stage.querySelector("img,video,iframe"); if (el) setTransform(el); });
  btnZoomOut.addEventListener("click", ()=>{ scale=Math.max(0.25,scale-0.2); const el=stage.querySelector("img,video,iframe"); if (el) setTransform(el); });
  btnZoomReset.addEventListener("click", ()=>{ resetTransform(); const el=stage.querySelector("img,video,iframe"); if (el) setTransform(el); });

  // Albums local fallback
  function loadAlbumsLocal(){
    albums = JSON.parse(localStorage.getItem("mx_albums_v5")||"[]");
    const m = JSON.parse(localStorage.getItem("mx_album_items_v5")||"{}");
    albumItems = new Map(Object.entries(m).map(([k,v])=>[k,new Set(v)]));
  }

  // Init
  (async function init(){
    document.documentElement.style.setProperty('--thumb-h', sizeRange.value + 'px');
    user = await getSession(); if (!user){ window.location.href="auth.html"; return; }
    userEmailEl.textContent = user.email || "";
    if (sb){ await loadAlbums(); } else { loadAlbumsLocal(); renderAlbums(); }
    await listFiles();
  })();

  // Global actions
  bulkCopy.addEventListener("click", async ()=>{
    if (!selected.size){ toast("No hay seleccionados"); return; }
    const links = await signedLinks(Array.from(selected), 3600);
    try { await navigator.clipboard.writeText(links.join("\\n")); toast("Links copiados"); } catch(e){ toast("No se pudo copiar"); }
  });

  logoutBtn.addEventListener("click", async ()=>{ if (sb) await sb.auth.signOut(); localStorage.removeItem("mx_session"); window.location.href="index.html"; });

})();