/* Admin panel */
(() => {
  const cfg = window.CONFIG || {};
  if (cfg.mode !== "supabase") {
    document.getElementById("modeWarn").classList.remove("hidden");
    return;
  }
  kycSearch.addEventListener('click', ()=>{ kycPage=0; loadKyc(); });
  kycPrev.addEventListener('click', ()=>{ if (kycPage>0){ kycPage--; loadKyc(); } });
  kycNext.addEventListener('click', ()=>{ kycPage++; loadKyc(); });
  if (!cfg.supabaseUrl || !cfg.supabaseAnonKey) {
    document.getElementById("modeWarn").classList.remove("hidden");
    document.getElementById("modeWarn").innerHTML = 'Configura <b>supabaseUrl</b> y <b>supabaseAnonKey</b>.';
    return;
  }
  kycSearch.addEventListener('click', ()=>{ kycPage=0; loadKyc(); });
  kycPrev.addEventListener('click', ()=>{ if (kycPage>0){ kycPage--; loadKyc(); } });
  kycNext.addEventListener('click', ()=>{ kycPage++; loadKyc(); });
  const sb = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey);

  let ROLES = { admin:false, deposits:false, kyc:false, reports:false };
  async function loadRoles(){
    const { data:adm } = await sb.rpc('is_admin');
    ROLES.admin = !!adm;
    for (const r of ['deposits','kyc','reports']){
      const { data } = await sb.rpc('has_role', { r });
      ROLES[r] = !!data || ROLES.admin;
    }
  kycSearch.addEventListener('click', ()=>{ kycPage=0; loadKyc(); });
  kycPrev.addEventListener('click', ()=>{ if (kycPage>0){ kycPage--; loadKyc(); } });
  kycNext.addEventListener('click', ()=>{ kycPage++; loadKyc(); });
    document.querySelector('[data-tab="deposits"]').classList.toggle('hidden', !ROLES.deposits);
    document.getElementById('deposits').classList.toggle('hidden', !ROLES.deposits);
    document.querySelector('[data-tab="kyc"]').classList.toggle('hidden', !ROLES.kyc);
    document.getElementById('kyc').classList.toggle('hidden', !ROLES.kyc);
    document.querySelector('[data-tab="reports"]').classList.toggle('hidden', !ROLES.reports);
    document.getElementById('reports').classList.toggle('hidden', !ROLES.reports);
    // Tenants tab solo admin
    const tbtn = document.querySelector('[data-tab="tenants"]'); const tsec = document.getElementById('tenants');
    if (tbtn && tsec){ tbtn.classList.toggle('hidden', !ROLES.admin); tsec.classList.toggle('hidden', !ROLES.admin); }
  }
  kycSearch.addEventListener('click', ()=>{ kycPage=0; loadKyc(); });
  kycPrev.addEventListener('click', ()=>{ if (kycPage>0){ kycPage--; loadKyc(); } });
  kycNext.addEventListener('click', ()=>{ kycPage++; loadKyc(); });

  const tabs = document.querySelectorAll(".tab");
  const sections = document.querySelectorAll(".tabsec");
  function showTab(id){
    sections.forEach(s => s.classList.toggle("hidden", s.id !== id));
    tabs.forEach(t => t.classList.toggle("bg-white/20", t.dataset.tab === id));
  }
  kycSearch.addEventListener('click', ()=>{ kycPage=0; loadKyc(); });
  kycPrev.addEventListener('click', ()=>{ if (kycPage>0){ kycPage--; loadKyc(); } });
  kycNext.addEventListener('click', ()=>{ kycPage++; loadKyc(); });
  tabs.forEach(t => t.addEventListener("click", () => showTab(t.dataset.tab)));
  showTab("deposits");

  const guard = document.getElementById("guard");
  const adminEmail = document.getElementById("adminEmail");
  const logoutBtn = document.getElementById("logoutBtn");
  logoutBtn.addEventListener("click", async ()=>{ await sb.auth.signOut(); location.href="index.html"; });

  async function requireAdmin(){
    const { data } = await sb.auth.getUser();
    if (!data?.user){ location.href="auth.html"; return null; }
    adminEmail.textContent = data.user.email || "";
    const { data: isAdm, error } = await sb.rpc("is_admin");
    if (error || !isAdm){
      guard.classList.remove("hidden");
      guard.textContent = "No eres admin o faltan políticas. Pide acceso.";
      return null;
    }
  kycSearch.addEventListener('click', ()=>{ kycPage=0; loadKyc(); });
  kycPrev.addEventListener('click', ()=>{ if (kycPage>0){ kycPage--; loadKyc(); } });
  kycNext.addEventListener('click', ()=>{ kycPage++; loadKyc(); });
    return data.user;
  }
  kycSearch.addEventListener('click', ()=>{ kycPage=0; loadKyc(); });
  kycPrev.addEventListener('click', ()=>{ if (kycPage>0){ kycPage--; loadKyc(); } });
  kycNext.addEventListener('click', ()=>{ kycPage++; loadKyc(); });

  // --- Deposits tab ---
  const depRows = document.getElementById("depRows");
  const depQ = document.getElementById('depQ');
  const depStart = document.getElementById('depStart');
  const depEnd = document.getElementById('depEnd');
  const depSearch = document.getElementById('depSearch');
  const depPrev = document.getElementById('depPrev');
  const depNext = document.getElementById('depNext');
  let depPage = 0; const DEP_SIZE = 50;

  async function loadDeposits(){
    depRows.innerHTML = "";
    let q = sb.from('bank_deposits').select('*').in('status',['pending','pending_second','on_hold']);
    if (CURRENT_TENANT && CURRENT_TENANT!=='ALL') q = q.eq('tenant_id', CURRENT_TENANT);
    if (depStart.value) q = q.gte('created_at', depStart.value);
    if (depEnd.value) q = q.lte('created_at', depEnd.value);
    q = q.order('created_at',{ascending:false}).range(depPage*DEP_SIZE, depPage*DEP_SIZE + DEP_SIZE - 1);
    const { data, error } = await q;
    if (error){ depRows.innerHTML = `<tr><td class="p-2 text-red-400" colspan="6">${error.message}</td></tr>`; return; }
    const ids = (data||[]).map(d=>d.user_id).filter(Boolean);
    let emailMap = {};
    if (ids.length){
      const { data: profs } = await sb.from('profiles').select('user_id,email').in('user_id', ids);
      (profs||[]).forEach(p => emailMap[p.user_id]=p.email||'');
    }
  kycSearch.addEventListener('click', ()=>{ kycPage=0; loadKyc(); });
  kycPrev.addEventListener('click', ()=>{ if (kycPage>0){ kycPage--; loadKyc(); } });
  kycNext.addEventListener('click', ()=>{ kycPage++; loadKyc(); });
    (data||[]).forEach(r => {
      const tr = document.createElement("tr");
      const isSecond = r.status === 'pending_second';
      tr.innerHTML = `<td><input type=\"checkbox\" class=\"sel\"></td><td class="p-2">${r.id}</td>
        <td class="p-2">${r.user_id}<br><span class='text-slate-400 text-xs'>${emailMap[r.user_id]||''}</span></td>
        <td class="p-2">${(r.expected_cents/100).toFixed(2)}</td>
        <td class="p-2">${(r.currency||'mxn').toUpperCase()}</td>
        <td class="p-2">${new Date(r.created_at).toLocaleString()}</td>
        <td class="p-2 flex gap-2">
          <button class="approve px-3 py-1 rounded-md bg-brand-500 hover:bg-brand-600 text-white">Aprobar</button>
          <button class="reject px-3 py-1 rounded-md bg-white/10 hover:bg-white/20">Rechazar</button>
        </td>`;
      tr.querySelector(".approve").addEventListener("click", async ()=>{
        if (!confirm("¿Aprobar este depósito?")) return;
        // Primera aprobación (o final si no requiere dual)
                // OTP gate for high amounts
        const { data: lim } = await sb.rpc('get_deposit_limits');
        // Preferir TOTP si está habilitado
        let preferTotp = false;
        try { const { data:u } = await sb.auth.getUser(); const email = u?.user?.email; const chk = await fetch('/functions/v1/totp-verify', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ email, code: '000000' }) }); const jj = await chk.json(); preferTotp = (jj.error === 'not_enabled') ? false : true; } catch(e) {}

        const needOtp = (r.expected_cents||0) >= (lim?.dual_required_above_cents || 0);
        let okOtp = true;
        if (needOtp){
          const { data:u } = await sb.auth.getUser();
          const email = u?.user?.email;
          if (!email){ alert('Sesión inválida'); return; }
          if (preferTotp){
            const code = prompt('Ingresa tu código TOTP (App)'); if (!code) return;
            const r = await fetch('/functions/v1/totp-verify', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ email, code }) });
            const j = await r.json(); if (!j.ok){ alert('TOTP inválido'); return; }
          } else {
            await sendOTP(email);
            const code = prompt('Se envió un código a tu email. Ingrésalo:'); if (!code) return;
            okOtp = await checkOTP(sb, code);
            if (!okOtp){ alert('OTP incorrecto/expirado'); return; }
          }
        }
if (isSecond){
          const { data: res2, error: e2 } = await sb.rpc('admin_finalize_bank_deposit', { p_ref: r.id });
          if (e2){ alert(e2.message); return; }
          slack(`Depósito ${r.id} aprobado (dual)`);
        } else {
          const { data: res1, error: err1 } = await sb.rpc('admin_approve_bank_deposit_v2', { p_ref: r.id });
          if (err1){ alert(err1.message); return; }
          if (res1 === 'pending_second'){ alert('Primera aprobación registrada. Requiere segunda aprobación.'); }
        }
        if (err1){ alert(err1.message); return; }
        if (res1 === 'pending_second'){
          alert('Primera aprobación registrada. Requiere segunda aprobación.');
          slack(`Depósito ${r.id} pasó a pending_second • ${(r.expected_cents/100).toFixed(2)} ${(r.currency||'MXN').toUpperCase()}`);
        } else {
          slack(`Depósito ${r.id} aprobado (single) • ${(r.expected_cents/100).toFixed(2)} ${(r.currency||'MXN').toUpperCase()}`);
        }
        loadDeposits();
      });
      tr.querySelector('.cpy').addEventListener('click', ()=>{
        const url = `${location.origin}/approve.html?id=${r.id}&stage=${isSecond ? 'final':'first'}`;
        navigator.clipboard.writeText(url); alert('Link copiado');
      });
      tr.querySelector('.reject').addEventListener('click', async ()=>{
        const reason = prompt('Motivo del rechazo:'); if (!reason) return;
        const { error: err } = await sb.rpc('admin_reject_bank_deposit', { p_ref: r.id, p_reason: reason });
        if (!err){ slack(`Depósito ${r.id} rechazado: ${reason}`); }
        if (err){ alert(err.message); return; }
        loadDeposits();
      });
      depRows.appendChild(tr);
    });
    const qtxt = (depQ.value||'').trim().toLowerCase();
    if (qtxt){
      Array.from(depRows.children).forEach(tr=>{
        const txt = tr.textContent.toLowerCase();
        tr.style.display = txt.includes(qtxt) ? '' : 'none';
      });
    }
  kycSearch.addEventListener('click', ()=>{ kycPage=0; loadKyc(); });
  kycPrev.addEventListener('click', ()=>{ if (kycPage>0){ kycPage--; loadKyc(); } });
  kycNext.addEventListener('click', ()=>{ kycPage++; loadKyc(); });
    if (!data || data.length===0){
      depRows.innerHTML = `<tr><td class="p-3 text-slate-400" colspan="6">No hay pendientes.</td></tr>`;
    }
  kycSearch.addEventListener('click', ()=>{ kycPage=0; loadKyc(); });
  kycPrev.addEventListener('click', ()=>{ if (kycPage>0){ kycPage--; loadKyc(); } });
  kycNext.addEventListener('click', ()=>{ kycPage++; loadKyc(); });
  }
  kycSearch.addEventListener('click', ()=>{ kycPage=0; loadKyc(); });
  kycPrev.addEventListener('click', ()=>{ if (kycPage>0){ kycPage--; loadKyc(); } });
  kycNext.addEventListener('click', ()=>{ kycPage++; loadKyc(); });
  depSearch.addEventListener('click', ()=>{ depPage=0; loadDeposits(); });
  depPrev.addEventListener('click', ()=>{ if (depPage>0){ depPage--; loadDeposits(); } });
  depNext.addEventListener('click', ()=>{ depPage++; loadDeposits(); });

  // --- KYC tab ---
  const kycRows = document.getElementById("kycRows");
  const kycQ = document.getElementById('kycQ');
  const kycSearch = document.getElementById('kycSearch');
  const kycPrev = document.getElementById('kycPrev');
  const kycNext = document.getElementById('kycNext');
  let kycPage=0; const KYC_SIZE=50;
  function isUUID(v){ return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v); }

  async function loadKyc(){
    kycRows.innerHTML = "";
    let q = sb.from('profiles').select('user_id,email,kyc_level,kyc_status,tenant_id').order('updated_at',{ascending:false});
    if (CURRENT_TENANT && CURRENT_TENANT!=='ALL') q = q.eq('tenant_id', CURRENT_TENANT);
    const term = (kycQ.value||'').trim();
    if (term){
      if (isUUID(term)) q = q.eq('user_id', term);
      else q = q.ilike('email', '%' + term + '%');
    }
  kycSearch.addEventListener('click', ()=>{ kycPage=0; loadKyc(); });
  kycPrev.addEventListener('click', ()=>{ if (kycPage>0){ kycPage--; loadKyc(); } });
  kycNext.addEventListener('click', ()=>{ kycPage++; loadKyc(); });
    q = q.range(kycPage*KYC_SIZE, kycPage*KYC_SIZE+KYC_SIZE-1);
    const { data, error } = await q;
    if (error){ kycRows.innerHTML = `<tr><td class="p-2 text-red-400" colspan="5">${error.message}</td></tr>`; return; }
    const ids = (data||[]).map(d=>d.user_id).filter(Boolean);
    let emailMap = {};
    if (ids.length){
      const { data: profs } = await sb.from('profiles').select('user_id,email').in('user_id', ids);
      (profs||[]).forEach(p => emailMap[p.user_id]=p.email||'');
    }
  kycSearch.addEventListener('click', ()=>{ kycPage=0; loadKyc(); });
  kycPrev.addEventListener('click', ()=>{ if (kycPage>0){ kycPage--; loadKyc(); } });
  kycNext.addEventListener('click', ()=>{ kycPage++; loadKyc(); });
    (data||[]).forEach(r => {
      const tr = document.createElement("tr");
      tr.innerHTML = `<td class="p-2">${r.user_id}</td>
        <td class="p-2">${r.email||''}</td>
        <td class="p-2">${r.kyc_level||'none'}</td>
        <td class="p-2">${r.kyc_status||'unverified'}</td>
        <td class="p-2 flex gap-2">
          <button data-s="verified" class="px-2 py-1 rounded-md bg-white/10 hover:bg-white/20">Verificar</button>
          <button data-s="rejected" class="px-2 py-1 rounded-md bg-white/10 hover:bg-white/20">Rechazar</button>
        </td>`;
      tr.querySelectorAll("button").forEach(b => b.addEventListener("click", async ()=>{
        const status = b.dataset.s;
        const note = status==='verified' ? 'manual verify' : 'manual reject';
        const { error: err } = await sb.rpc('admin_set_kyc_status', { p_user: r.user_id, p_status: status, p_note: note });
        if (err){ alert(err.message); return; }
        loadKyc();
      }));
      kycRows.appendChild(tr);
    });
  }
  kycSearch.addEventListener('click', ()=>{ kycPage=0; loadKyc(); });
  kycPrev.addEventListener('click', ()=>{ if (kycPage>0){ kycPage--; loadKyc(); } });
  kycNext.addEventListener('click', ()=>{ kycPage++; loadKyc(); });

  // --- Reports tab ---
  function fmtDate(d){ return (new Date(d)).toISOString().slice(0,10); }
  const pStart = document.getElementById("pStart");
  const pEnd = document.getElementById("pEnd");
  const pFetch = document.getElementById("pFetch");
  const pCsv = document.getElementById("pCsv");
  const pXlsxBtn = document.createElement('button');
  pXlsxBtn.id = 'pXlsx'; pXlsxBtn.className = 'px-3 py-2 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white ml-2';
  pXlsxBtn.textContent = 'Exportar XLSX';
  pCsv.parentElement?.appendChild(pXlsxBtn);

  const pList = document.getElementById("pList");
  const pProvider = document.getElementById('pProvider');
  const pZip = document.getElementById('pZip');
  const pXlsxAll = document.getElementById('pXlsxAll');
  const normalizeMxn = document.getElementById('normalizeMxn');
  const pivotCountry = document.getElementById('pivotCountry');
  const auditZipBtn = document.getElementById('auditZip');

  const wStart = document.getElementById("wStart");
  const wEnd = document.getElementById("wEnd");
  const wFetch = document.getElementById("wFetch");
  const wCsv = document.getElementById("wCsv");
  const wList = document.getElementById("wList");

  pStart.value = fmtDate(Date.now()-7*86400000);
  pEnd.value = fmtDate(Date.now());
  wStart.value = fmtDate(Date.now()-7*86400000);
  wEnd.value = fmtDate(Date.now());

  let pData = [], wData = [];

  pFetch.addEventListener("click", async ()=>{
    let q = sb.from('purchases').select('*').gte('created_at', pStart.value).lte('created_at', pEnd.value);
    if (pProvider.value) q = q.eq('provider', pProvider.value);
    const { data, error } = await q.order('created_at',{ascending:false}).limit(1000);
    // FX normalization
    let rates = {};
    if (normalizeMxn.checked){ const { data:fx } = await sb.from('fx_rates').select('*'); (fx||[]).forEach(r=>rates[(r.currency||'').toUpperCase()]=Number(r.rate_to_mxn||1)); }
    // Country map from profiles
    const uids = Array.from(new Set((data||[]).map(r=>r.user_id))).filter(Boolean);
    let countryMap = {}; if (pivotCountry.checked && uids.length){ const { data: pf } = await sb.from('profiles').select('user_id,country').in('user_id', uids); (pf||[]).forEach(p=>countryMap[p.user_id]=p.country||''); }
    if (error){ pList.innerHTML = `<li class="text-red-400">${error.message}</li>`; return; }
    pData = data||[];
    pList.innerHTML = "";
    pData.forEach(r => {
      const li = document.createElement("li");
      li.textContent = `${r.created_at} • ${r.user_id} • ${r.provider} • ${r.gb} GB • ${(r.currency||'mxn').toUpperCase()} ${(r.amount_cents||0)/100}`;
      pList.appendChild(li);
    });
    if (pData.length===0) pList.innerHTML = '<li class="text-slate-400">Sin resultados</li>';
    // Charts
    try{ renderCharts(pData); }catch(e){}
  });

  wFetch.addEventListener("click", async ()=>{
    const { data, error } = await sb.from("wallet_ledger").select("*").gte("created_at", wStart.value).lte("created_at", wEnd.value).order("created_at",{ascending:false}).limit(1000);
    if (error){ wList.innerHTML = `<li class="text-red-400">${error.message}</li>`; return; }
    wData = data||[];
    wList.innerHTML = "";
    wData.forEach(r => {
      const li = document.createElement("li");
      li.textContent = `${r.created_at} • ${r.user_id} • ${r.type} • ${(r.currency||'mxn').toUpperCase()} ${(r.amount_cents||0)/100} • ${r.provider}`;
      wList.appendChild(li);
    });
    if (wData.length===0) wList.innerHTML = '<li class="text-slate-400">Sin resultados</li>';
  });

  function toCSV(arr){
    if (!arr || !arr.length) return "";
    const cols = Object.keys(arr[0]);
    const esc = v => `"${String(v??'').replace(/"/g,'""')}"`;
    return [cols.join(","), ...arr.map(r => cols.map(c => esc(r[c])).join(","))].join("\n");
  }
  kycSearch.addEventListener('click', ()=>{ kycPage=0; loadKyc(); });
  kycPrev.addEventListener('click', ()=>{ if (kycPage>0){ kycPage--; loadKyc(); } });
  kycNext.addEventListener('click', ()=>{ kycPage++; loadKyc(); });
  pCsv.addEventListener("click", ()=>{
    const csv = toCSV(pData);
    const blob = new Blob([csv], { type:"text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "purchases.csv";
    a.click();
  });
  wCsv.addEventListener("click", ()=>{
    const csv = toCSV(wData);
    const blob = new Blob([csv], { type:"text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "wallet_ledger.csv";
    a.click();
  });

  // init
  (async function init(){
    const u = await requireAdmin();
    if (!u) return;
    await loadRoles();
    await loadTenants(sb);
    if (ROLES.deposits) await loadDeposits();
    if (ROLES.kyc) await loadKyc();
    await (typeof applyBrand==='function' ? applyBrand() : Promise.resolve());
    await (typeof refreshTeams==='function' ? refreshTeams() : Promise.resolve());
    await (typeof loadPolicies==='function' ? loadPolicies() : Promise.resolve());
  })();
})();

  // Bulk PDFs ZIP
  pZip.addEventListener('click', async ()=>{
    if (!pData || !pData.length){ alert('Carga primero compras.'); return; }
    const zip = new JSZip();
    for (const r of pData){
      const { jsPDF } = window.jspdf;
      const d = new jsPDF();
      d.setFontSize(16); d.text('MIXTLI - Recibo', 20, 20);
      d.setFontSize(12);
      let y = 40;
      const lines = [
        'Fecha: ' + (r.created_at||''),
        'Usuario: ' + (r.user_id||''),
        'Proveedor: ' + (r.provider||''),
        'GB: ' + (r.gb||0),
        'Monto: ' + ((r.amount_cents||0)/100) + ' ' + String(r.currency||'MXN').toUpperCase(),
        'Ref: ' + (r.provider_ref||'')
      ];
      lines.forEach(t => { d.text(t, 20, y); y += 10; });
      const pdfb64 = d.output('datauristring').split(',')[1];
      const fname = 'recibo-' + (r.created_at||'') .replace(/[:\s]/g,'_') + '-' + (r.user_id||'') + '.pdf';
      zip.file(fname, pdfb64, {base64:true});
    }
    const blob = await zip.generateAsync({ type: 'blob' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'recibos.zip';
    a.click();
  });


// --- OTP helpers & Slack notify ---
async function sendOTP(email){
  try{
    const r = await fetch('/functions/v1/send-otp', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ to: email }) });
    const j = await r.json(); return !!j.ok;
  }catch(e){ return false; }
}
async function checkOTP(sb, code){
  const { data, error } = await sb.rpc('admin_check_otp', { p_code: String(code||'') });
  if (error) return false; return !!data;
}
async function slack(text){
  try{ await fetch('/functions/v1/slack-notify', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ text }) }); }catch(e){}
}

  // XLSX export
  document.getElementById('pXlsx')?.addEventListener('click', ()=>{
    if (!pData || !pData.length){ alert('Carga primero compras.'); return; }
    const rows = pData.map(r => ({
      created_at: r.created_at,
      user_id: r.user_id,
      provider: r.provider,
      gb: r.gb,
      amount: (r.amount_cents||0)/100,
      currency: (r.currency||'mxn').toUpperCase(),
      provider_ref: r.provider_ref
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'purchases');
    XLSX.writeFile(wb, 'purchases.xlsx');
  });

function renderCharts(rows){
  const byMonth = {};
  const byProv = {};
  rows.forEach(r => {
    const m = (r.created_at||'').slice(0,7);
    const amt = (r.amount_cents||0)/100;
    byMonth[m] = (byMonth[m]||0) + amt;
    byProv[r.provider||''] = (byProv[r.provider||'']||0) + amt;
  });
  const mLabels = Object.keys(byMonth).sort();
  const mData = mLabels.map(k => byMonth[k]);
  const pLabels = Object.keys(byProv);
  const pData = pLabels.map(k => byProv[k]);

  const ctx1 = document.getElementById('revByMonth')?.getContext('2d');
  const ctx2 = document.getElementById('revByProvider')?.getContext('2d');
  if (!ctx1 || !ctx2) return;

  if (window._c1) window._c1.destroy();
  if (window._c2) window._c2.destroy();

  window._c1 = new Chart(ctx1, {
    type: 'line',
    data: { labels: mLabels, datasets: [{ label: 'Ingresos', data: mData }] },
    options: { responsive: true, scales: { y: { beginAtZero: true } } }
  });
  window._c2 = new Chart(ctx2, {
    type: 'bar',
    data: { labels: pLabels, datasets: [{ label: 'Por proveedor', data: pData }] },
    options: { responsive: true, scales: { y: { beginAtZero: true } } }
  });
}


// --- Tenants: load & filter ---
const tenantSel = document.getElementById('tenantSel');
let CURRENT_TENANT = null;
async function loadTenants(sb){
  try{
    const { data: ut } = await sb.from('user_tenants').select('tenant_id').eq('user_id', (await sb.auth.getUser()).data.user.id);
    if (!ut || !ut.length){ return; }
    const ids = ut.map(x=>x.tenant_id);
    const { data: t } = await sb.from('tenants').select('*').in('id', ids);
    if (t && t.length){
      tenantSel.classList.remove('hidden');
      if (ROLES.admin){ tenantSel.innerHTML = `<option value="ALL">Todos los tenants</option>` + t.map(x=>`<option value="${x.id}">${x.name}</option>`).join(''); CURRENT_TENANT='ALL'; }
      else { tenantSel.innerHTML = t.map(x=>`<option value="${x.id}">${x.name}</option>`).join(''); CURRENT_TENANT = t[0].id; }
      tenantSel.addEventListener('change', ()=>{ CURRENT_TENANT = tenantSel.value; if (ROLES.deposits) loadDeposits(); if (ROLES.kyc) loadKyc(); });
    }
  }catch(e){}
}

// --- TOTP setup modal ---
const totpBtn = document.getElementById('totpBtn');
const totpModal = document.getElementById('totpModal');
const totpClose = document.getElementById('totpClose');
const totpQR = document.getElementById('totpQR');
const totpSecret = document.getElementById('totpSecret');
const totpCode = document.getElementById('totpCode');
const totpVerifyBtn = document.getElementById('totpVerify');
const totpMsg = document.getElementById('totpMsg');

function showTotp(v){ totpModal.classList.toggle('hidden', !v); totpModal.classList.toggle('flex', v); }

totpBtn?.addEventListener('click', async ()=>{
  const { data:u } = await sb.auth.getUser();
  const email = u?.user?.email; if (!email) return;
  const r = await fetch('/functions/v1/totp-setup', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ email, issuer:'Mixtli' }) });
  const j = await r.json();
  if (!j.ok){ alert('Error TOTP'); return; }
  totpSecret.textContent = j.secret;
  // usa API charts QR simple (placeholder) — en prod usa una lib de QR
  totpQR.src = 'https://api.qrserver.com/v1/create-qr-code/?size=192x192&data=' + encodeURIComponent(j.uri);
  showTotp(true);
});

totpClose?.addEventListener('click', ()=>showTotp(false));
totpVerifyBtn?.addEventListener('click', async ()=>{
  const { data:u } = await sb.auth.getUser();
  const email = u?.user?.email; if (!email) return;
  const code = totpCode.value;
  const r = await fetch('/functions/v1/totp-verify', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ email, code }) });
  const j = await r.json();
  totpMsg.textContent = j.ok ? '✅ TOTP verificado' : '❌ Código inválido';
});

// --- Tenants tab controls ---
const brandColor = document.getElementById('brandColor');
const brandLogo = document.getElementById('brandLogo');
const brandSave = document.getElementById('brandSave');
const invEmail = document.getElementById('invEmail');
const invRole = document.getElementById('invRole');
const invSend = document.getElementById('invSend');
const invMsg = document.getElementById('invMsg');

async function applyBrand(){
  if (!CURRENT_TENANT) return;
  const { data:t } = await sb.from('tenants').select('*').eq('id', CURRENT_TENANT).single();
  if (!t) return;
  brandColor.value = t.brand_primary || '#7c3aed';
  brandLogo.value = t.brand_logo_url || '';
  document.documentElement.style.setProperty('--brand', brandColor.value);
  const logos = document.querySelectorAll('img[alt="logo"]');
  if (t.brand_logo_url){ logos.forEach(el => el.src = t.brand_logo_url); }
  // brand buttons
  document.querySelectorAll('.bg-brand-500').forEach(el => el.style.backgroundColor = brandColor.value);
  document.querySelectorAll('.hover\:bg-brand-600').forEach(el => el.style.backgroundColor = brandColor.value);
}

brandSave?.addEventListener('click', async ()=>{
  if (!CURRENT_TENANT){ alert('Selecciona un tenant'); return; }
  const { error } = await sb.from('tenants').update({ brand_primary: brandColor.value, brand_logo_url: brandLogo.value }).eq('id', CURRENT_TENANT);
  if (error) { alert(error.message); return; }
  await applyBrand();
  alert('Brand actualizado');
});

invSend?.addEventListener('click', async ()=>{
  if (!CURRENT_TENANT){ alert('Selecciona un tenant'); return; }
  const email = (invEmail.value||'').trim(); if (!email) return;
  const role = invRole.value || 'agent';
  // Guarda invitación; el trigger la aplicará al crear perfil post-signup
  const { error } = await sb.from('tenant_invites').insert({ email, tenant_id: CURRENT_TENANT, role, invited_by: (await sb.auth.getUser()).data.user.email });
  if (error){ invMsg.textContent = error.message; return; }
  invMsg.textContent = 'Invitación registrada. Envía un magic-link al correo.';
  try{
    await fetch('/functions/v1/send-otp', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ to: email }) });
  }catch(e){}
});

// Reaplica brand al cambiar tenant
tenantSel?.addEventListener('change', applyBrand);

  // Cross-tenant XLSX (admin + selector ALL)
  pXlsxAll?.addEventListener('click', async ()=>{
    const { data: pur, error } = await sb.from('purchases').select('*').gte('created_at', pStart.value).lte('created_at', pEnd.value).limit(10000);
    if (error){ alert(error.message); return; }
    const { data: tenants } = await sb.from('tenants').select('id,slug,name');
    const tmap = {}; (tenants||[]).forEach(t=>tmap[t.id]=t.name||t.slug||t.id);
    // Pivots
    const byTenant={}, byProvider={}, byMonth={};
    (pur||[]).forEach(r=>{
      const amt=(r.amount_cents||0)/100, t=r.tenant_id||'sin-tenant', p=r.provider||'otro', m=(r.created_at||'').slice(0,7);
      byTenant[t]=(byTenant[t]||0)+amt; byProvider[p]=(byProvider[p]||0)+amt; byMonth[m]=(byMonth[m]||0)+amt;
    });
    const rowsTenant = Object.keys(byTenant).map(k=>({ tenant: tmap[k]||k, amount: byTenant[k] }));
    const rowsProv = Object.keys(byProvider).map(k=>({ provider:k, amount: byProvider[k] }));
    const rowsMonth = Object.keys(byMonth).sort().map(k=>({ month:k, amount: byMonth[k] }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rowsTenant), 'by_tenant');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rowsProv), 'by_provider');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rowsMonth), 'by_month');
    XLSX.writeFile(wb, 'cross-tenant-pivots.xlsx');
  });

  // Teams UI
  const teamName = document.getElementById('teamName');
  const teamLimit = document.getElementById('teamLimit');
  const teamCreate = document.getElementById('teamCreate');
  const teamAddEmail = document.getElementById('teamAddEmail');
  const teamId = document.getElementById('teamId');
  const teamAdd = document.getElementById('teamAdd');
  const teamsList = document.getElementById('teamsList');

  async function refreshTeams(){
    if (!CURRENT_TENANT || CURRENT_TENANT==='ALL') { teamsList.innerHTML=''; return; }
    const { data:t } = await sb.from('teams').select('*').eq('tenant_id', CURRENT_TENANT).order('created_at',{ascending:false}).limit(200);
    const rows = (t||[]).map(x=>`${x.id} • ${x.name} • límite ${(x.monthly_limit_cents||0)/100}`).join('<br>');
    teamsList.innerHTML = rows || '<span class="text-slate-400">No hay teams</span>';
  }

  teamCreate?.addEventListener('click', async ()=>{
    if (!CURRENT_TENANT || CURRENT_TENANT==='ALL'){ alert('Selecciona un tenant'); return; }
    const name = (teamName.value||'').trim(); const lim = parseInt(teamLimit.value||'0',10) || 0;
    const { error } = await sb.from('teams').insert({ tenant_id: CURRENT_TENANT, name, monthly_limit_cents: lim });
    if (error){ alert(error.message); return; }
    teamName.value=''; teamLimit.value=''; refreshTeams();
  });

  teamAdd?.addEventListener('click', async ()=>{
    const email = (teamAddEmail.value||'').trim(); const tid = (teamId.value||'').trim();
    if (!email || !tid){ alert('Falta email o Team ID'); return; }
    const { data: prof } = await sb.from('profiles').select('user_id').eq('email', email).single();
    if (!prof){ alert('Usuario no encontrado'); return; }
    const { error } = await sb.from('user_teams').insert({ user_id: prof.user_id, team_id: tid });
    if (error){ alert(error.message); return; }
    teamAddEmail.value=''; teamId.value=''; alert('Agregado');
  });

  tenantSel?.addEventListener('change', refreshTeams);

  // Audit ZIP export
  auditZipBtn?.addEventListener('click', async ()=>{
    const { data: acts, error } = await sb.from('admin_actions').select('*').gte('created_at', pStart.value).lte('created_at', pEnd.value).limit(5000);
    if (error){ alert(error.message); return; }
    function toCSV(rows){
      const cols = ['id','created_at','actor_email','entity','action','ref_id','amount_cents','currency','details','sig'];
      const head = cols.join(',');
      const body = (rows||[]).map(r => cols.map(k => {
        let v = r[k]; if (typeof v === 'object' && v !== null) v = JSON.stringify(v);
        if (v === null || v === undefined) v = '';
        const s = String(v).replace(/"/g,'""');
        return '"' + s + '"';
      }).join(',')).join('\n');
      return head + '\n' + body;
    }
    const csv = toCSV(acts||[]);
    const zip = new JSZip(); zip.file('admin_actions.csv', csv);
    // KMS firma opcional: firmamos el CSV y agregamos .sig
    try{ const b64 = await blobToBase64(new Blob([csv])); const r = await fetch('/functions/v1/audit-sign-kms', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ b64 }) }); const j = await r.json(); if (j?.ok && j.sig){ zip.file('admin_actions.sig', j.sig); } }catch(e){}
    const blob2 = await zip.generateAsync({ type:'blob' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob2); a.download = 'audit_logs.zip'; a.click();

  });

// --- Políticas por tenant ---
const polMaxOp = document.getElementById('polMaxOp');
const polMaxDaily = document.getElementById('polMaxDaily');
const polSave = document.getElementById('polSave');
const polMsg = document.getElementById('polMsg');

async function loadPolicies(){
  if (!CURRENT_TENANT || CURRENT_TENANT==='ALL') { polMaxOp.value=''; polMaxDaily.value=''; return; }
  const { data } = await sb.from('policy_limits').select('*').eq('tenant_id', CURRENT_TENANT).single();
  polMaxOp.value = data?.max_op_cents ?? '';
  polMaxDaily.value = data?.max_daily_user_cents ?? '';
}

polSave?.addEventListener('click', async ()=>{
  if (!CURRENT_TENANT || CURRENT_TENANT==='ALL'){ alert('Selecciona un tenant'); return; }
  const max_op = parseInt(polMaxOp.value||'0',10) || 0;
  const max_daily = parseInt(polMaxDaily.value||'0',10) || 0;
  const { error } = await sb.from('policy_limits').upsert({ tenant_id: CURRENT_TENANT, max_op_cents: max_op, max_daily_user_cents: max_daily, updated_at: new Date().toISOString() });
  polMsg.textContent = error ? error.message : 'Políticas guardadas';
});

tenantSel?.addEventListener('change', loadPolicies);

async function blobToBase64(blob){
  return new Promise((resolve,reject)=>{
    const r = new FileReader(); r.onloadend=()=>resolve(String(r.result).split(',')[1]); r.onerror=reject; r.readAsDataURL(blob);
  });
}

// --- PWA & Push ---
let _deferredPrompt = null;
window.addEventListener('beforeinstallprompt', (e)=>{ e.preventDefault(); _deferredPrompt = e; });
document.getElementById('pwaInstall')?.addEventListener('click', async ()=>{ if (_deferredPrompt){ _deferredPrompt.prompt(); _deferredPrompt=null; }});

async function regSW(){ try{ return await navigator.serviceWorker.register('assets/service-worker.js'); }catch(e){ return null; } }
async function askPush(){
  if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)){ alert('Push no soportado'); return; }
  const sw = await regSW(); if (!sw){ alert('SW no disponible'); return; }
  const perm = await Notification.requestPermission(); if (perm !== 'granted'){ alert('Permiso denegado'); return; }
  const key = (window.CONFIG && window.CONFIG.vapidPublicKey) || '';
  if (!key){ alert('Falta VAPID public key en assets/config.js'); return; }
  const appKey = urlBase64ToUint8Array(key);
  const sub = await sw.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: appKey });
  const { data:u } = await sb.auth.getUser();
  await fetch('/functions/v1/push-register', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ user_id: u?.user?.id, email: u?.user?.email, subscription: sub, tenant_id: CURRENT_TENANT && CURRENT_TENANT!=='ALL' ? CURRENT_TENANT : null }) });
  alert('Push habilitado');
}

document.getElementById('pushEnable')?.addEventListener('click', askPush);
document.getElementById('pushTest')?.addEventListener('click', async ()=>{
  await fetch('/functions/v1/push-broadcast', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ title:'Test', text:'Hola 👋', url: location.href, tenant_id: CURRENT_TENANT && CURRENT_TENANT!=='ALL' ? CURRENT_TENANT : null }) });
  alert('Push enviado');
});

function urlBase64ToUint8Array(base64String){
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64); const outputArray = new Uint8Array(rawData.length);
  for (let i=0; i<rawData.length; ++i){ outputArray[i] = rawData.charCodeAt(i); } return outputArray;
}

// --- Antifraude ---
const fQuery = document.getElementById('fQuery');
const fSearch = document.getElementById('fSearch');
const fTimeline = document.getElementById('fTimeline');
const fSignals = document.getElementById('fSignals');

fSearch?.addEventListener('click', async ()=>{
  const q = (fQuery.value||'').trim(); if (!q) return;
  // Buscar por email → user_id
  let userId = q;
  if (q.includes('@')){
    const { data:p } = await sb.from('profiles').select('user_id').eq('email', q).single();
    userId = p?.user_id || q;
  }
  const { data: deps } = await sb.from('bank_deposits').select('*').eq('user_id', userId).order('created_at',{ascending:false}).limit(200);
  const { data: buys } = await sb.from('purchases').select('*').eq('user_id', userId).order('created_at',{ascending:false}).limit(200);
  const { data: anom } = await sb.from('anomalies').select('*').in('ref_id', (deps||[]).map(d=>d.id)).order('created_at',{ascending:false}).limit(200);
  const { data: acts } = await sb.from('admin_actions').select('*').in('ref_id', (deps||[]).map(d=>d.id)).order('created_at',{ascending:false}).limit(200);
  const { data: risks } = await sb.from('risk_assessments').select('*').in('ref_id', (deps||[]).map(d=>d.id)).order('created_at',{ascending:false}).limit(200);

  // Timeline
  const events = [];
  (deps||[]).forEach(d=> events.push({ t: d.created_at, kind:'deposit', txt:`Depósito ${(d.expected_cents/100).toFixed(2)} ${(d.currency||'MXN').toUpperCase()} • ${d.status}` }));
  (buys||[]).forEach(p=> events.push({ t: p.created_at, kind:'purchase', txt:`Compra ${(p.amount_cents/100).toFixed(2)} ${(p.currency||'MXN').toUpperCase()}` }));
  (acts||[]).forEach(a=> events.push({ t: a.created_at, kind:'action', txt:`Admin ${a.action}` }));
  (anom||[]).forEach(a=> events.push({ t: a.created_at, kind:'anomaly', txt:`Anomalía ${a.reason||''} (score ${a.score||''})` }));
  (risks||[]).forEach(r=> events.push({ t: r.created_at, kind:'risk', txt:`Riesgo ${r.band} (score ${r.score})` }));
  events.sort((a,b)=> (a.t<b.t?1:-1));

  fTimeline.innerHTML = events.map(ev => `<li> ${new Date(ev.t).toLocaleString()} • ${ev.txt} </li>`).join('') || '<li class="text-slate-400">Sin eventos</li>';

  // Señales: por mes mostrar peor banda
  const byMonth = {};
  (risks||[]).forEach(r=>{ const m = (r.created_at||'').slice(0,7); const order = {low:1,medium:2,high:3}; byMonth[m] = Math.max(byMonth[m]||0, order[r.band]||0); });
  const months = Object.keys(byMonth).sort();
  fSignals.innerHTML = months.map(m => {
    const v = byMonth[m]; const color = v===3 ? 'bg-rose-600' : v===2 ? 'bg-amber-500' : 'bg-emerald-600';
    return `<div class="p-3 rounded-md ${color} text-white text-xs">${m}</div>`;
  }).join('') || '<div class="text-slate-400">Sin señales</div>';
});

// --- Swipe Mode ---
const swipeBtn = document.getElementById('swipeMode');
const swipeOverlay = document.getElementById('swipeOverlay');
const swipeCard = document.getElementById('swipeCard');
const swipeInfo = document.getElementById('swipeInfo');
const swipeApprove = document.getElementById('swipeApprove');
const swipeReject = document.getElementById('swipeReject');
const swipeClose = document.getElementById('swipeClose');

let _swipeQueue = []; let _current = 0; let _pos = {x:0,y:0}; let _drag=false;

swipeBtn?.addEventListener('click', ()=>{
  // Construye cola desde la tabla actual (pDataDeposits si existe)
  try{
    const rows = Array.from(document.querySelectorAll('#depTable tbody tr')).map(tr => tr._rowData).filter(Boolean);
    _swipeQueue = rows; _current = 0;
    if (!_swipeQueue.length){ alert('No hay depósitos pendientes'); return; }
    showSwipe();
  }catch(e){ alert('Recarga la lista primero'); }
});

function showSwipe(){
  swipeOverlay.classList.remove('hidden');
  renderSwipe();
}
function hideSwipe(){ swipeOverlay.classList.add('hidden'); }

function renderSwipe(){
  const r = _swipeQueue[_current]; if (!r){ hideSwipe(); return; }
  swipeInfo.innerHTML = `
    <div class="flex items-center justify-between">
      <div class="text-xs px-2 py-1 rounded-full ${r.status==='on_hold'?'bg-amber-500/20 text-amber-300 border border-amber-500/30':'bg-white/5 text-slate-300 border border-white/10'}">${r.status}</div>
      <div class="text-xs text-slate-400">${_current+1}/${_swipeQueue.length}</div>
    </div>
    <div class="mt-2"><span class="text-slate-400">Ref:</span> ${r.id}</div>
    <div><span class="text-slate-400">Monto:</span> ${(r.expected_cents/100).toFixed(2)} ${(r.currency||'MXN').toUpperCase()}</div>
    <div><span class="text-slate-400">Usuario:</span> ${r.user_id}</div>
  `;
  swipeCard.style.transform = 'translateX(0px) rotate(0deg)';
  _pos = {x:0,y:0};
}
function nextSwipe(){ _current++; renderSwipe(); }

function onDragStart(e){ _drag=true; _pos.x=0; _pos.y=0; }
function onDragMove(e){
  if (!_drag) return; const dx = (e.touches? e.touches[0].clientX : e.clientX) - (window.innerWidth/2);
  _pos.x = dx; const rot = dx/20; swipeCard.style.transform = `translateX(${dx}px) rotate(${rot}deg)`;
}
function onDragEnd(){
  if (!_drag) return; _drag=false;
  if (_pos.x > 120){ doApprove(); }
  else if (_pos.x < -120){ doReject(); }
  else { swipeCard.style.transform = 'translateX(0px) rotate(0deg)'; }
}
swipeCard?.addEventListener('pointerdown', onDragStart);
window.addEventListener('pointermove', onDragMove);
window.addEventListener('pointerup', onDragEnd);
swipeCard?.addEventListener('touchstart', onDragStart);
window.addEventListener('touchmove', onDragMove);
window.addEventListener('touchend', onDragEnd);

swipeApprove?.addEventListener('click', doApprove);
swipeReject?.addEventListener('click', doReject);
swipeClose?.addEventListener('click', hideSwipe);

async function doApprove(){
  const r = _swipeQueue[_current]; if (!r) return;
  try{
    // Reutiliza misma lógica que botones normales (llamadas RPC)
    const { data: lim } = await sb.rpc('get_deposit_limits');
    const needOtp = (r.expected_cents||0) >= (lim?.dual_required_above_cents || 0);
    if (needOtp){
      const { data:u } = await sb.auth.getUser();
      const chk = await fetch('/functions/v1/totp-verify', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ email: u?.user?.email, code: '000000' }) }); const jj = await chk.json();
      if (!(jj.error === 'not_enabled')){ const c = prompt('TOTP'); if (!c) return; const rr = await fetch('/functions/v1/totp-verify', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ email: u?.user?.email, code: c }) }); const j2 = await rr.json(); if (!j2.ok){ alert('TOTP inválido'); return; } }
      else { await fetch('/functions/v1/send-otp', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ to: u?.user?.email }) }); const code = prompt('OTP email'); if (!code) return; const ok = await sb.rpc('admin_check_otp', { p_code: String(code) }); if (ok.error || !ok.data){ alert('OTP inválido'); return; } }
    }
    if (r.status==='pending_second'){ const { error } = await sb.rpc('admin_finalize_bank_deposit', { p_ref: r.id }); if (error) throw error; }
    else { const { data:s, error } = await sb.rpc('admin_approve_bank_deposit_v2', { p_ref: r.id }); if (error) throw error; }
    nextSwipe();
  }catch(e){ alert(e.message||String(e)); }
}
async function doReject(){
  const r = _swipeQueue[_current]; if (!r) return;
  const reason = prompt('Motivo del rechazo'); if (!reason) return;
  const { error } = await sb.rpc('admin_reject_bank_deposit', { p_ref: r.id, p_reason: reason });
  if (error){ alert(error.message); return; }
  nextSwipe();
}

// --- Rules Editor ---
const ruleName = document.getElementById('ruleName');
const ruleJson = document.getElementById('ruleJson');
const ruleValidate = document.getElementById('ruleValidate');
const ruleSave = document.getElementById('ruleSave');
const ruleList = document.getElementById('ruleList');
const ruleMsg = document.getElementById('ruleMsg');
const ruleUl = document.getElementById('ruleUl');

ruleValidate?.addEventListener('click', ()=>{
  try{ JSON.parse(ruleJson.value||'{}'); ruleMsg.textContent = '✅ JSON válido'; }catch(e){ ruleMsg.textContent = '❌ ' + e.message; }
});
ruleSave?.addEventListener('click', async ()=>{
  const name = (ruleName.value||'').trim(); if (!name){ alert('Pon un nombre'); return; }
  let content; try{ content = JSON.parse(ruleJson.value||'{}'); }catch(e){ alert('JSON inválido'); return; }
  const { error } = await sb.from('risk_rules').upsert({ name, content, active:true, updated_at: new Date().toISOString() });
  ruleMsg.textContent = error ? error.message : 'Guardado';
});
ruleList?.addEventListener('click', async ()=>{
  const { data } = await sb.from('risk_rules').select('*').eq('active', true).order('updated_at', { ascending:false }).limit(100);
  ruleUl.innerHTML = (data||[]).map(r => `<li><b>${r.name}</b> — <code>${JSON.stringify(r.content)}</code></li>`).join('') || '<li class="text-slate-400">Sin reglas</li>';
});

// --- Batch + Undo (10s) ---
const depApproveSel = document.getElementById('depApproveSel');
const depRejectSel = document.getElementById('depRejectSel');
const undoBox = document.getElementById('undoBox');
const undoBtn = document.getElementById('undoBtn');

let _pendingBatch = null; let _undoTimer = null;

function selectedDeposits(){
  return Array.from(document.querySelectorAll('#depTable tbody tr')).filter(tr => tr.querySelector('.sel')?.checked).map(tr => tr._rowData);
}

function startBatch(kind){
  const items = selectedDeposits();
  if (!items.length){ alert('Selecciona al menos uno'); return; }
  _pendingBatch = { kind, items };
  undoBox.classList.remove('hidden');
  if (_undoTimer) clearTimeout(_undoTimer);
  _undoTimer = setTimeout(executeBatch, 10000);
}

async function executeBatch(){
  if (!_pendingBatch) return;
  const { kind, items } = _pendingBatch;
  for (const r of items){
    try{
      if (kind === 'approve'){
        if (r.status==='pending_second'){ const { error } = await sb.rpc('admin_finalize_bank_deposit', { p_ref: r.id }); if (error) throw error; }
        else { const { error } = await sb.rpc('admin_approve_bank_deposit_v2', { p_ref: r.id }); if (error) throw error; }
      }else{
        const reason = 'batch'; const { error } = await sb.rpc('admin_reject_bank_deposit', { p_ref: r.id, p_reason: reason }); if (error) throw error;
      }
    }catch(e){ console.warn('batch item fail', r.id, e.message||e); }
  }
  _pendingBatch = null; undoBox.classList.add('hidden'); clearTimeout(_undoTimer); _undoTimer = null;
  // refresca
  if (typeof loadDeposits === 'function') loadDeposits();
}

depApproveSel?.addEventListener('click', ()=> startBatch('approve'));
depRejectSel?.addEventListener('click', ()=> startBatch('reject'));
undoBtn?.addEventListener('click', ()=>{ if (_undoTimer){ clearTimeout(_undoTimer); _undoTimer=null; } _pendingBatch=null; undoBox.classList.add('hidden'); });


// --- Visual Rules Builder ---
const vrFields = [
  { id:'amount_gte', label:'Monto ≥ (cents)', type:'number', key:'cents' },
  { id:'currency_is', label:'Moneda (ISO)', type:'text', key:'code' },
  { id:'country_is', label:'País (ISO-2)', type:'text', key:'code' },
  { id:'provider_is', label:'Proveedor', type:'text', key:'code' }
];
(function mountVisualRules(){
  const host = document.getElementById('rules');
  if (!host) return;
  const box = document.createElement('div'); box.className='mt-4 rounded-xl border border-white/10 p-4';
  box.innerHTML = `<div class="font-semibold mb-2">Constructor visual</div>
  <div class="grid md:grid-cols-4 gap-2">
    <select id="vrType" class="h-9 px-2 rounded-md bg-white/10 border border-white/10">
      ${vrFields.map(f=>`<option value="${f.id}">${f.label}</option>`).join('')}
    </select>
    <input id="vrValue" class="h-9 px-2 rounded-md bg-white/10 border border-white/10" placeholder="valor">
    <select id="vrEffect" class="h-9 px-2 rounded-md bg-white/10 border border-white/10">
      <option value="raise">raise</option>
      <option value="hold">hold</option>
    </select>
    <button id="vrAdd" class="px-3 py-2 rounded-md bg-white/10 hover:bg-white/20">Añadir al JSON</button>
  </div>`;
  host.appendChild(box);
  const vrType = box.querySelector('#vrType'); const vrValue = box.querySelector('#vrValue'); const vrEffect = box.querySelector('#vrEffect'); const vrAdd = box.querySelector('#vrAdd');
  vrAdd.addEventListener('click', ()=>{
    const t = vrType.value; const v = vrValue.value; const eff = vrEffect.value;
    const cfg = vrFields.find(x=>x.id===t); if (!cfg){ alert('Tipo inválido'); return; }
    let obj = { type: t, effect: eff }; obj[cfg.key] = (cfg.type==='number') ? parseInt(v||'0',10)||0 : v;
    try{
      const cur = ruleJson.value?.trim(); let arr = [];
      if (cur){ const parsed = JSON.parse(cur); arr = Array.isArray(parsed) ? parsed : [parsed]; }
      arr.push(obj); ruleJson.value = JSON.stringify(arr, null, 2);
      ruleMsg.textContent = 'Añadido';
    }catch(e){ ruleMsg.textContent = 'JSON inválido en textarea'; }
  });
})();

// --- Queues CRUD & Metrics ---
const qName = document.getElementById('qName');
const qSlug = document.getElementById('qSlug');
const qSla = document.getElementById('qSla');
const qRegion = document.getElementById('qRegion');
const qProvider = document.getElementById('qProvider');
const qPriority = document.getElementById('qPriority');
const qSave = document.getElementById('qSave');
const qList = document.getElementById('qList');
const qMsg = document.getElementById('qMsg');
const qMetrics = document.getElementById('qMetrics');
const dqDep = document.getElementById('dqDep');
const dqQueue = document.getElementById('dqQueue');
const dqAssign = document.getElementById('dqAssign');
const dqMsg = document.getElementById('dqMsg');

qSave?.addEventListener('click', async ()=>{
  const rec = {
    name: (qName.value||'').trim(),
    slug: (qSlug.value||'').trim() || null,
    sla_minutes: parseInt(qSla.value||'0',10)||60,
    region: (qRegion.value||'').trim() || null,
    provider: (qProvider.value||'').trim() || null,
    priority: parseInt(qPriority.value||'5',10)||5,
    tenant_id: CURRENT_TENANT && CURRENT_TENANT!=='ALL' ? CURRENT_TENANT : null
  };
  const { error } = await sb.from('queues').upsert(rec, { onConflict:'slug' });
  qMsg.textContent = error ? error.message : 'Guardado';
});

qList?.addEventListener('click', async ()=>{
  const { data } = await sb.from('queues').select('*').order('priority',{ascending:true}).limit(200);
  const { data:met } = await sb.rpc('queue_metrics');
  qMetrics.innerHTML = (met||[]).map(m => {
    const row = (data||[]).find(q=>q.id===m.queue_id);
    return `<li><b>${m.name}</b> • pend ${m.pending} • SLA🔔 ${m.breached} • TTR≈ ${m.avg_ttr_mins? m.avg_ttr_mins.toFixed(1):'-'} min ${row?.region? '• '+row.region:''} ${row?.provider? '• '+row.provider:''}</li>`;
  }).join('') || '<li class="text-slate-400">Sin colas</li>';
});

dqAssign?.addEventListener('click', async ()=>{
  const dep = (dqDep.value||'').trim(); const qid = (dqQueue.value||'').trim();
  if (!dep || !qid){ dqMsg.textContent = 'Faltan datos'; return; }
  const { error } = await sb.from('deposit_queues').upsert({ deposit_id: dep, queue_id: qid, assigned_at: new Date().toISOString(), assigned_by: (await sb.auth.getUser()).data.user.email });
  dqMsg.textContent = error ? error.message : 'Asignado';
});

// ===== Ops (SLA & Calendarios) =====
const bhDay = document.getElementById('bhDay');
const bhStart = document.getElementById('bhStart');
const bhEnd = document.getElementById('bhEnd');
const bhTZ = document.getElementById('bhTZ');
const bhSave = document.getElementById('bhSave');
const bhCopyWeek = document.getElementById('bhCopyWeek');
const bhMsg = document.getElementById('bhMsg');

const holDate = document.getElementById('holDate');
const holName = document.getElementById('holName');
const holAdd = document.getElementById('holAdd');
const holList = document.getElementById('holList');

const escQueue = document.getElementById('escQueue');
const escThreshold = document.getElementById('escThreshold');
const escTarget = document.getElementById('escTarget');
const escPrio = document.getElementById('escPrio');
const escSave = document.getElementById('escSave');
const escMsg = document.getElementById('escMsg');
const btnEscalate = document.getElementById('btnEscalate');

bhSave?.addEventListener('click', async ()=>{
  if (!CURRENT_TENANT || CURRENT_TENANT==='ALL'){ alert('Selecciona tenant'); return; }
  const rec = { tenant_id: CURRENT_TENANT, weekday: parseInt(bhDay.value,10), start_time: bhStart.value, end_time: bhEnd.value, timezone: bhTZ.value||'UTC' };
  const { error } = await sb.from('business_hours').upsert(rec, { onConflict: 'tenant_id,weekday' });
  bhMsg.textContent = error ? error.message : 'Guardado';
});
bhCopyWeek?.addEventListener('click', async ()=>{
  if (!CURRENT_TENANT || CURRENT_TENANT==='ALL'){ alert('Selecciona tenant'); return; }
  for (const wd of [1,2,3,4,5]){
    await sb.from('business_hours').upsert({ tenant_id: CURRENT_TENANT, weekday: wd, start_time: bhStart.value, end_time: bhEnd.value, timezone: bhTZ.value||'UTC' });
  }
  bhMsg.textContent = 'Copiado Lun–Vie';
});

holAdd?.addEventListener('click', async ()=>{
  if (!CURRENT_TENANT || CURRENT_TENANT==='ALL'){ alert('Selecciona tenant'); return; }
  const { error } = await sb.from('holidays').upsert({ tenant_id: CURRENT_TENANT, day: holDate.value, name: holName.value||null });
  if (error){ alert(error.message); return; }
  loadHolidays();
});
async function loadHolidays(){
  if (!CURRENT_TENANT || CURRENT_TENANT==='ALL'){ holList.innerHTML=''; return; }
  const { data } = await sb.from('holidays').select('*').eq('tenant_id', CURRENT_TENANT).order('day',{ascending:true}).limit(365);
  holList.innerHTML = (data||[]).map(h => `<li>${h.day} — ${h.name||''}</li>`).join('') || '<li class="text-slate-400">Sin feriados</li>';
}

escSave?.addEventListener('click', async ()=>{
  const rec = { queue_id: escQueue.value.trim(), threshold_minutes: parseInt(escThreshold.value||'0',10)||0, target: escTarget.value, priority: parseInt(escPrio.value||'3',10)||3, active: true };
  const { error } = await sb.from('queue_escalations').insert(rec);
  escMsg.textContent = error ? error.message : 'Guardado';
});

btnEscalate?.addEventListener('click', async ()=>{
  const { data, error } = await sb.rpc('escalate_overdue');
  alert(error ? error.message : `Escalados: ${data}`);
});

// ===== Agentes =====
const agEmail = document.getElementById('agEmail');
const agAdd = document.getElementById('agAdd');
const agQueue = document.getElementById('agQueue');
const agMap = document.getElementById('agMap');
const agMsg = document.getElementById('agMsg');

agAdd?.addEventListener('click', async ()=>{
  const email = agEmail.value.trim(); if (!email) return;
  const { data: p } = await sb.from('profiles').select('user_id').eq('email', email).single();
  if (!p){ agMsg.textContent = 'Usuario no encontrado'; return; }
  const { error } = await sb.from('agents').upsert({ user_id: p.user_id, active: true });
  agMsg.textContent = error ? error.message : 'Agente activado';
});

agMap?.addEventListener('click', async ()=>{
  const email = agEmail.value.trim(); const qid = agQueue.value.trim(); if (!email || !qid) return;
  const { data: p } = await sb.from('profiles').select('user_id').eq('email', email).single();
  if (!p){ agMsg.textContent = 'Usuario no encontrado'; return; }
  const { error } = await sb.from('agent_queues').upsert({ user_id: p.user_id, queue_id: qid });
  agMsg.textContent = error ? error.message : 'Mapeado';
});

// ===== Reportes operativos =====
async function loadOpsReports(){
  // Trae depósitos pendientes para heatmap y aging
  const { data: dq } = await sb.from('deposit_queues').select('deposit_id,assigned_at,queue_id').limit(5000);
  const { data: dep } = await sb.from('bank_deposits').select('id,status,tenant_id,created_at').in('id', (dq||[]).map(x=>x.deposit_id));
  const map = {}; (dep||[]).forEach(d=>map[d.id]=d);

  // Heatmap: hora x día (pendientes)
  const grid = Array.from({length:7},()=>Array(24).fill(0));
  (dq||[]).forEach(x=>{
    const d = new Date(x.assigned_at); const dow = d.getDay(); const h = d.getHours();
    const st = map[x.deposit_id]?.status;
    if (st && ['pending','pending_second','on_hold'].includes(st)){ grid[dow][h]++; }
  });
  renderHeatmap(grid);

  // Aging buckets (minutos desde asignación; aproximado real sin business calc en UI)
  const now = Date.now();
  const buckets = { '0-30':0,'30-60':0,'60-120':0,'120-240':0,'240+':0 };
  (dq||[]).forEach(x=>{
    const st = map[x.deposit_id]?.status;
    if (!st || !['pending','pending_second','on_hold'].includes(st)) return;
    const mins = Math.floor((now - new Date(x.assigned_at).getTime())/60000);
    if (mins<30) buckets['0-30']++; else if (mins<60) buckets['30-60']++; else if (mins<120) buckets['60-120']++; else if (mins<240) buckets['120-240']++; else buckets['240+']++;
  });
  renderAging(buckets);

  // Funnel: pending -> approved/rejected en última semana
  const weekAgo = new Date(Date.now()-7*86400000).toISOString();
  const { data: fdep } = await sb.from('bank_deposits').select('status,created_at').gte('created_at', weekAgo);
  const funnel = { pending:0, approved:0, rejected:0 };
  (fdep||[]).forEach(d=>{
    if (d.status==='approved') funnel.approved++; else if (d.status==='rejected') funnel.rejected++; else funnel.pending++;
  });
  renderFunnel(funnel);
}

function renderHeatmap(grid){
  const ctx = document.getElementById('heatmap'); if (!ctx) return;
  const data = {
    labels: ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'],
    datasets: Array.from({length:7}).map((_,i)=>({ label: ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'][i], data: grid[i] }))
  };
  new Chart(ctx, { type: 'bar', data: { labels: Array.from({length:24}, (_,h)=>h+':00'), datasets: data.datasets.map((ds,i)=>({ label: ds.label, data: ds.data, stack: 'h'+i })) }, options: { responsive:true, plugins:{ legend:{ display:false }}, scales:{ x:{ stacked:true }, y:{ stacked:true }}}});
}

function renderAging(bk){
  const ctx = document.getElementById('aging'); if (!ctx) return;
  new Chart(ctx, { type:'bar', data:{ labels:Object.keys(bk), datasets:[{ label:'Casos', data:Object.values(bk) }]}, options:{ responsive:true } });
}
function renderFunnel(fn){
  const ctx = document.getElementById('funnel'); if (!ctx) return;
  new Chart(ctx, { type:'bar', data:{ labels:Object.keys(fn), datasets:[{ label:'Depósitos (7d)', data:Object.values(fn) }]}, options:{ responsive:true } });
}

document.addEventListener('DOMContentLoaded', ()=>{
  if (document.getElementById('ops')) loadOpsReports();
});

// ===== WFM =====
const wfmQueue = document.getElementById('wfmQueue');
const wfmAHT = document.getElementById('wfmAHT');
const wfmOcc = document.getElementById('wfmOcc');
const wfmSave = document.getElementById('wfmSave');
const wfmForecast = document.getElementById('wfmForecast');

wfmSave?.addEventListener('click', async ()=>{
  const qid = (wfmQueue.value||'').trim(); if (!qid || !CURRENT_TENANT || CURRENT_TENANT==='ALL'){ alert('Selecciona tenant y queue'); return; }
  const rec = { tenant_id: CURRENT_TENANT, queue_id: qid, aht_sec: parseInt(wfmAHT.value||'300',10)||300, occupancy: parseFloat(wfmOcc.value||'0.85')||0.85 };
  const { error } = await sb.from('wfm_params').upsert(rec);
  alert(error ? error.message : 'Guardado');
});
wfmForecast?.addEventListener('click', async ()=>{
  await fetch('/functions/v1/wfm-forecast', { method:'POST', body: '{}' });
  const start = new Date(); start.setHours(0,0,0,0); const end = new Date(); end.setHours(23,59,59,999);
  const { data } = await sb.from('wfm_forecast').select('*').eq('queue_id', (wfmQueue.value||'').trim()).gte('date_hour', start.toISOString()).lte('date_hour', end.toISOString()).order('date_hour', { ascending: true });
  const labels = (data||[]).map(r => new Date(r.date_hour).getHours()+':00');
  const reqs = (data||[]).map(r => r.required_agents||0);
  const ctx = document.getElementById('wfmChart'); if (ctx){ new Chart(ctx, { type:'line', data:{ labels, datasets:[{ label:'Agentes requeridos', data: reqs }] }, options:{ responsive:true } }); }
});

// ===== BI Export =====
const biExportAll = document.getElementById('biExportAll');
const biExportDep = document.getElementById('biExportDep');
const biExportPur = document.getElementById('biExportPur');
const biMsg = document.getElementById('biMsg');

async function callExport(what){
  const r = await fetch('/functions/v1/bq-export', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ what }) });
  const j = await r.json();
  biMsg.textContent = j.ok ? 'Export OK' : ('Error: ' + j.error);
}
biExportAll?.addEventListener('click', ()=>callExport('all'));
biExportDep?.addEventListener('click', ()=>callExport('deposits'));
biExportPur?.addEventListener('click', ()=>callExport('purchases'));
