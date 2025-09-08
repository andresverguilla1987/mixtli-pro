(() => {
  const cfg = window.MIXTLI_CFG || {}; const base = (cfg.apiBase || '');
  const f = document.getElementById('f'); const out = document.getElementById('out');
  const toast = document.getElementById('toast');
  function showToast(msg){ toast.textContent = msg; toast.classList.add('show'); setTimeout(()=>toast.classList.remove('show'), 2500); }
  f.addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
      name: document.getElementById('name').value.trim(),
      email: document.getElementById('email').value.trim(),
      password: document.getElementById('pwd').value,
      plan: document.getElementById('plan').value
    };
    try {
      const r = await fetch(base + '/auth/register', { method:'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify(payload) });
      if (!r.ok) throw new Error('status ' + r.status);
      const data = await r.json();
      out.textContent = '✔ Cuenta creada: ' + (data.user?.email || payload.email) + ' (id ' + (data.user?.id || data.id || 'n/a') + ')';
      showToast('Cuenta creada');
    } catch (err) {
      // Demo fallback
      const demoId = Math.random().toString(36).slice(2);
      out.textContent = '✔ (demo) Cuenta creada: ' + payload.email + ' — id ' + demoId;
      showToast('Demo: cuenta creada');
    }
  });
})();