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
    let q = sb.from('bank_deposits').select('*').in('status',['pending','pending_second']);
    if (CURRENT_TENANT) q = q.eq('tenant_id', CURRENT_TENANT);
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
      tr.innerHTML = `<td class="p-2">${r.id}</td>
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
    if (CURRENT_TENANT) q = q.eq('tenant_id', CURRENT_TENANT);
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
      tenantSel.innerHTML = t.map(x=>`<option value="${x.id}">${x.name}</option>`).join('');
      CURRENT_TENANT = t[0].id;
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
