(() => {
  const cfg = window.MIXTLI_CFG;
  const email = document.getElementById('email');
  const pwd = document.getElementById('pwd');
  const msg = document.getElementById('msg');
  document.getElementById('modeText').textContent = cfg.mode.toUpperCase();

  function saveSession(u){ localStorage.setItem('mixtli_user', JSON.stringify(u)); msg.textContent = 'Sesión iniciada: ' + u.email; }

  document.getElementById('submit').onclick = async () => {
    const payload = { email: email.value.trim(), password: pwd.value };
    if (!payload.email || !payload.password) { msg.textContent = 'Completa los campos'; return; }

    if (cfg.mode === 'prisma') {
      try {
        const r = await fetch('/auth/register', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ ...payload, name: payload.email.split('@')[0], plan: 'free' }) });
        const data = await r.json(); if (!r.ok) throw new Error(data.error||'error');
        saveSession(data.user);
      } catch(e) { msg.textContent = 'Error de servidor'; }
    } else if (cfg.mode === 'supabase') {
      msg.textContent = 'Conectar con Supabase Auth aquí (demo)';
      saveSession({ email: payload.email });
    } else {
      // demo local
      saveSession({ email: payload.email });
    }
  };
})();