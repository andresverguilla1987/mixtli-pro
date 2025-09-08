(async () => {
  const cfg = window.MIXTLI_CFG || {};
  const base = (cfg.usersApi || cfg.apiBase || '');
  async function get(path, fallback) {
    try {
      const r = await fetch(base + path, { headers: { 'X-Request-Id': 'preview-users-' + Date.now() } });
      if (!r.ok) throw new Error('status ' + r.status);
      return await r.json();
    } catch (e) { return fallback; }
  }

  const fallbackStats = await fetch('./assets/users-fallback.json').then(r => r.json());
  const stats = await get('/users/stats', fallbackStats);
  const recent = await get('/users/recent', fallbackStats.recent || []);

  const $ = (id) => document.getElementById(id);
  $('total').textContent = stats.totalUsers?.toLocaleString?.() || '—';
  $('mau').textContent = stats.monthlyActive?.toLocaleString?.() || '—';
  $('wau').textContent = stats.weeklyActive?.toLocaleString?.() || '—';
  $('dau').textContent = stats.dailyActive?.toLocaleString?.() || '—';

  // Sparkline
  const data = (stats.signupsByDay || []).slice(-30);
  const svg = document.getElementById('spark');
  const w = 120, h = 36, pad = 3;
  const max = Math.max(1, ...data.map(d => d.count||0));
  const pts = data.map((d,i) => {
    const x = pad + i * ((w - 2*pad) / Math.max(1,data.length-1));
    const y = h - pad - ((d.count||0)/max) * (h - 2*pad);
    return [x,y];
  });
  const path = pts.map((p,i) => (i?'L':'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
  const area = path + ` L ${w-pad} ${h-pad} L ${pad} ${h-pad} Z`;
  svg.innerHTML = `<path d="${area}" fill="rgba(52,211,153,.2)" stroke="none"></path><path d="${path}" fill="none" stroke="#34d399" stroke-width="2"></path>`;

  // Table
  const tbody = document.querySelector('#table tbody');
  (recent || []).slice(0, 20).forEach(u => {
    const tr = document.createElement('tr');
    const d = new Date(u.signupAt || u.createdAt || Date.now());
    tr.innerHTML = `<td>${u.name || u.email}</td><td><span class="badge">${u.plan || 'free'}</span></td><td>${d.toLocaleDateString()}</td>`;
    tbody.appendChild(tr);
  });
})();