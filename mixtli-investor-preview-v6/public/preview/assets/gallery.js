(async () => {
  const cfg = window.MIXTLI_CFG || {}; const base = (cfg.apiBase || '');
  async function get(path, fallback) {
    try { const r = await fetch(base + path); if (!r.ok) throw 0; return await r.json(); } catch { return fallback; }
  }
  const fallback = await fetch('./gallery/fallback.json').then(r=>r.json());
  const list = await get('/gallery/list', fallback);
  const grid = document.getElementById('grid');
  (list||[]).forEach(it => {
    const card = document.createElement('div'); card.className='card-img';
    card.innerHTML = `<img src="${it.url}" alt="${it.title}"><div class="body"><b>${it.title}</b><div class="muted small">${it.desc||''}</div></div>`;
    grid.appendChild(card);
  });
})();