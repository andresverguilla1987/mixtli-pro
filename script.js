(() => {
  const $ = (id) => document.getElementById(id);
  const state = {
    baseUrl: localStorage.getItem('baseUrl') || 'http://localhost:10000',
    token: '',
    lastPresign: null, // { uploadId, putUrl, key }
    lastEtag: null,
  };

  $('baseUrl').value = state.baseUrl;
  $('saveCfg').onclick = async () => {
    state.baseUrl = $('baseUrl').value.trim();
    localStorage.setItem('baseUrl', state.baseUrl);
    $('health').textContent = 'Probando...';
    try {
      const r = await fetch(state.baseUrl + '/api/health');
      const j = await r.json();
      $('health').textContent = `OK (${j.driver})`;
    } catch (e) {
      $('health').textContent = 'No conecta';
    }
  };

  function log(s) {
    const el = $('log');
    el.textContent += s + "\n";
    el.scrollTop = el.scrollHeight;
  }

  async function authedFetch(path, opts={}) {
    const headers = Object.assign({}, opts.headers || {}, {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + state.token
    });
    const res = await fetch(state.baseUrl + path, Object.assign({}, opts, { headers }));
    if (!res.ok) {
      const txt = await res.text().catch(()=>'');
      throw new Error(`HTTP ${res.status} ${res.statusText}: ${txt}`);
    }
    return res;
  }

  // Register
  $('btnRegister').onclick = async () => {
    const email = $('regEmail').value.trim();
    const password = $('regPass').value;
    $('regOut').textContent = '...';
    try {
      const r = await fetch(state.baseUrl + '/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const j = await r.json();
      $('regOut').textContent = JSON.stringify(j, null, 2);
      log('Registro OK ' + email);
    } catch (e) {
      $('regOut').textContent = e.message;
    }
  };

  // Login
  $('btnLogin').onclick = async () => {
    const email = $('logEmail').value.trim();
    const password = $('logPass').value;
    $('logOut').textContent = '...';
    try {
      const r = await fetch(state.baseUrl + '/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const j = await r.json();
      state.token = j.token;
      $('token').value = state.token;
      $('logOut').textContent = 'Login OK';
      log('Login OK ' + email);
    } catch (e) {
      $('logOut').textContent = e.message;
      log('Login error');
    }
  };

  // Presign
  $('btnPresign').onclick = async () => {
    const f = $('file').files[0];
    if (!state.token) return $('presignOut').textContent = 'Falta token (login)';
    if (!f) return $('presignOut').textContent = 'Selecciona un archivo';
    const ttlDays = Number($('ttlDays').value || 14);
    $('presignOut').textContent = '...';
    try {
      const r = await authedFetch('/upload/presign', {
        method: 'POST',
        body: JSON.stringify({ filename: f.name, size: f.size, mime: f.type || 'application/octet-stream', ttlDays })
      });
      const j = await r.json();
      state.lastPresign = j;
      $('presignOut').textContent = JSON.stringify(j, null, 2);
      $('btnDoPut').disabled = false;
      $('emailUploadId').value = j.uploadId;
      log('Presign OK ' + f.name);
    } catch (e) {
      $('presignOut').textContent = e.message;
      $('btnDoPut').disabled = true;
    }
  };

  // PUT to bucket
  $('btnDoPut').onclick = async () => {
    const f = $('file').files[0];
    if (!state.lastPresign) return $('putOut').textContent = 'Primero genera presign';
    $('putOut').textContent = 'Subiendo...';
    try {
      const res = await fetch(state.lastPresign.putUrl, {
        method: 'PUT',
        headers: { 'Content-Type': f.type || 'application/octet-stream' },
        body: f
      });
      if (!res.ok) {
        const t = await res.text().catch(()=>'');
        throw new Error(`PUT ${res.status} ${res.statusText}: ${t}`);
      }
      const etag = res.headers.get('ETag') || res.headers.get('etag') || null;
      state.lastEtag = etag;
      $('putOut').textContent = 'PUT OK' + (etag ? `\nETag: ${etag}` : '');
      $('btnComplete').disabled = false;
      log('PUT OK');
    } catch (e) {
      $('putOut').textContent = e.message;
    }
  };

  // Complete
  $('btnComplete').onclick = async () => {
    if (!state.lastPresign) return $('completeOut').textContent = 'Primero presign/put';
    $('completeOut').textContent = '...';
    try {
      const r = await authedFetch('/upload/complete', {
        method: 'POST',
        body: JSON.stringify({ uploadId: state.lastPresign.uploadId, etag: state.lastEtag })
      });
      const j = await r.json();
      $('completeOut').textContent = JSON.stringify(j, null, 2);
      $('btnGetLink').disabled = false;
      log('Complete OK');
    } catch (e) {
      $('completeOut').textContent = e.message;
    }
  };

  // Get link
  $('btnGetLink').onclick = async () => {
    if (!state.lastPresign) return $('linkOut').textContent = 'Primero presign';
    $('linkOut').textContent = '...';
    try {
      const r = await authedFetch('/upload/' + state.lastPresign.uploadId + '/link', { method: 'GET' });
      const j = await r.json();
      $('linkOut').textContent = JSON.stringify(j, null, 2);
      log('Link listo');
    } catch (e) {
      $('linkOut').textContent = e.message;
    }
  };

  // Send email
  $('btnSendMail').onclick = async () => {
    const uploadId = $('emailUploadId').value.trim();
    const to = $('emailTo').value.trim();
    const message = $('emailMsg').value;
    $('mailOut').textContent = '...';
    try {
      const r = await authedFetch('/email/send', {
        method: 'POST',
        body: JSON.stringify({ uploadId, to, message })
      });
      const j = await r.json();
      $('mailOut').textContent = JSON.stringify(j, null, 2);
      log('Email enviado');
    } catch (e) {
      $('mailOut').textContent = e.message;
    }
  };

  // Auto-probar health al cargar
  (async () => { $('saveCfg').click(); })();
})();