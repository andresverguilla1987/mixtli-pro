(() => {
  const cfg = window.CONFIG || {};
  if (cfg.mode !== "supabase"){ console.warn("Dashboard requiere Supabase."); return; }
  const sb = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey);

  const el = (id)=>document.getElementById(id);

  async function load(){
    const now = new Date();
    const d30 = new Date(now.getTime() - 30*86400000).toISOString();
    const { data: pur } = await sb.from('purchases').select('*').gte('created_at', d30).limit(5000);
    const rev = (pur||[]).reduce((a,r)=> a + (r.amount_cents||0)/100, 0);
    const users = new Set((pur||[]).map(r=>r.user_id)).size || 1;
    el('rev30').textContent = money(rev);
    el('arpu').textContent = money(rev / users);

    // MRR estimado = suma proMonthly últimos 30 días (simples)
    const subs = (pur||[]).filter(r => (r.sku||'').toLowerCase().includes('promonthly'));
    const mrr = subs.reduce((a,r)=> a + (r.amount_cents||0)/100, 0);
    el('mrr').textContent = money(mrr);

    // churn aprox con recargas: 1 - (#usuarios con compra en últimos 30d / #usuarios con compra en previos 30-60d)
    const d60 = new Date(now.getTime() - 60*86400000).toISOString();
    const { data: prev } = await sb.from('purchases').select('user_id,created_at').gte('created_at', d60).lt('created_at', d30).limit(5000);
    const prevUsers = new Set((prev||[]).map(r=>r.user_id));
    const currentUsers = new Set((pur||[]).map(r=>r.user_id));
    const retained = Array.from(prevUsers).filter(u => currentUsers.has(u)).length;
    const churn = prevUsers.size ? (1 - retained / prevUsers.size) : 0;
    el('churn').textContent = (churn*100).toFixed(1) + '%';

    // charts
    renderCharts([...(pur||[]), ...(prev||[])]);

    // cohortes: por mes de alta en 'profiles' vs compras en pur
    const { data: profs } = await sb.from('profiles').select('user_id,created_at').limit(10000);
    const thisMonth = (now.toISOString()).slice(0,7);
    const cohortMap = {};
    (profs||[]).forEach(p => {
      const m = (p.created_at||'').slice(0,7);
      if (!cohortMap[m]) cohortMap[m] = { total:0, active:0 };
      cohortMap[m].total++;
      const hasBuy = (pur||[]).some(r => r.user_id === p.user_id);
      if (hasBuy) cohortMap[m].active++;
    });
    const rows = Object.keys(cohortMap).sort().map(m => {
      const c = cohortMap[m]; const pct = c.total ? Math.round(100*c.active/c.total) : 0;
      return `<div class="flex justify-between"><span>${m}</span><span>${pct}%</span></div>`;
    }).join('');
    document.getElementById('cohorts').innerHTML = rows || '<div class="text-slate-400">Cohortes no disponibles</div>';
  }

  function money(v){ return new Intl.NumberFormat('es-MX',{ style:'currency', currency:'MXN' }).format(v || 0); }

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

    const ctx1 = document.getElementById('byMonth')?.getContext('2d');
    const ctx2 = document.getElementById('byProvider')?.getContext('2d');
    if (!ctx1 || !ctx2) return;

    if (window._d1) window._d1.destroy();
    if (window._d2) window._d2.destroy();

    window._d1 = new Chart(ctx1, { type:'line', data:{ labels:mLabels, datasets:[{ label:'Ingresos', data:mData }] }, options:{ responsive:true, scales:{ y:{ beginAtZero:true }}} });
    window._d2 = new Chart(ctx2, { type:'bar', data:{ labels:pLabels, datasets:[{ label:'Proveedor', data:pData }] }, options:{ responsive:true, scales:{ y:{ beginAtZero:true }}} });
  }

  load();
})();
