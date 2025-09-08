(async () => {
  const cfg = window.MIXTLI_CFG || {}; const base = (cfg.usersApi || cfg.apiBase || '');
  async function get(path, fallback) {
    try { const r = await fetch(base + path); if (!r.ok) throw 0; return await r.json(); } catch { return fallback; }
  }
  const fallbackStats = await fetch('./assets/users-fallback.json').then(r=>r.json());
  const stats = await get('/users/stats', fallbackStats);
  const recent = await get('/users/recent', fallbackStats.recent||[]);
  const $ = (id) => document.getElementById(id);
  $('total').textContent = stats.totalUsers?.toLocaleString?.() || '—';
  $('mau').textContent = stats.monthlyActive?.toLocaleString?.() || '—';
  $('wau').textContent = stats.weeklyActive?.toLocaleString?.() || '—';
  $('dau').textContent = stats.dailyActive?.toLocaleString?.() || '—';
  const data = (stats.signupsByDay||[]).slice(-30); const w=120,h=36,p=3; const max=Math.max(1,...data.map(d=>d.count||0));
  const pts = data.map((d,i)=>[p+i*((w-2*p)/Math.max(1,data.length-1)), h-p-((d.count||0)/max)*(h-2*p)]);
  const path = pts.map((p,i)=>(i?'L':'M')+p[0].toFixed(1)+' '+p[1].toFixed(1)).join(' ');
  const area = path+` L ${w-p} ${h-p} L ${p} ${h-p} Z`; const svg=document.getElementById('spark');
  svg.innerHTML = `<path d="${area}" fill="rgba(52,211,153,.2)"></path><path d="${path}" fill="none" stroke="#34d399" stroke-width="2"></path>`;
  const tbody = document.querySelector('#table tbody');
  (recent||[]).slice(0,20).forEach(u=>{
    const tr=document.createElement('tr'); const d=new Date(u.signupAt||u.createdAt||Date.now());
    tr.innerHTML = `<td>${u.name||u.email}</td><td><span class="badge">${u.plan||'free'}</span></td><td>${d.toLocaleDateString()}</td>`; tbody.appendChild(tr);
  });
})();