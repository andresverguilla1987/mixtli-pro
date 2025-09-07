(()=>{
  const cfg = window.CONFIG || {};
  const sb = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey);
  const q = new URLSearchParams(location.search);
  const depId = q.get('id'); const stage = q.get('stage') || 'first';
  const el = (id)=>document.getElementById(id);

  async function init(){
    const { data:u } = await sb.auth.getUser();
    if (!u?.user){ el('authBox').classList.remove('hidden'); el('status').textContent='Sesión requerida'; return; }

    // Carga depósito
    const { data: dep, error } = await sb.from('bank_deposits').select('*').eq('id', depId).single();
    if (error || !dep){ el('status').textContent = 'Depósito no encontrado'; return; }

    el('status').textContent = stage==='final' ? 'Segunda aprobación requerida' : 'Aprobación pendiente';
    el('card').classList.remove('hidden');
    el('info').innerHTML = `
      <div><span class="text-slate-400">Ref:</span> ${dep.id}</div>
      <div><span class="text-slate-400">Monto:</span> ${(dep.expected_cents/100).toFixed(2)} ${(dep.currency||'MXN').toUpperCase()}</div>
      <div><span class="text-slate-400">Usuario:</span> ${dep.user_id}</div>
      <div><span class="text-slate-400">Estado:</span> ${dep.status}</div>
    `;

    // Botones
    el('btnApprove').addEventListener('click', ()=>handle(true, dep));
    el('btnReject').addEventListener('click', ()=>handle(false, dep));
  }

  async function ensureOTP(dep){
    // Usa límites para decidir si pedir OTP/TOTP
    const { data: lim } = await sb.rpc('get_deposit_limits');
    const needOtp = (dep.expected_cents||0) >= (lim?.dual_required_above_cents || 0);
    if (!needOtp) return true;

    // Preferir TOTP si activo
    let preferTotp = false;
    try{ const { data:u } = await sb.auth.getUser(); const chk = await fetch('/functions/v1/totp-verify', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ email: u?.user?.email, code: '000000' }) }); const jj = await chk.json(); preferTotp = (jj.error === 'not_enabled') ? false : true; }catch(e){}

    if (preferTotp){
      const code = prompt('Ingresa tu código TOTP'); if (!code) return false;
      const { data:u } = await sb.auth.getUser();
      const r = await fetch('/functions/v1/totp-verify', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ email: u?.user?.email, code }) });
      const j = await r.json(); if (!j.ok){ alert('TOTP inválido'); return false; }
      return true;
    } else {
      const { data:u } = await sb.auth.getUser();
      await fetch('/functions/v1/send-otp', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ to: u?.user?.email }) });
      const code = prompt('Se envió un código a tu email'); if (!code) return false;
      const ok = await sb.rpc('admin_check_otp', { p_code: String(code) });
      if (ok.error || !ok.data){ alert('OTP inválido'); return false; }
      return true;
    }
  }

  async function handle(isApprove, dep){
    if (!(await ensureOTP(dep))) return;
    try{
      if (isApprove){
        if (stage==='final' || dep.status==='pending_second'){
          const { error } = await sb.rpc('admin_finalize_bank_deposit', { p_ref: dep.id });
          if (error) throw error;
          alert('Aprobado (dual)');
        } else {
          const { data: res1, error } = await sb.rpc('admin_approve_bank_deposit_v2', { p_ref: dep.id });
          if (error) throw error;
          alert(res1==='pending_second' ? 'Primera aprobación registrada' : 'Aprobado');
        }
      } else {
        const reason = prompt('Motivo del rechazo:'); if (!reason) return;
        const { error } = await sb.rpc('admin_reject_bank_deposit', { p_ref: dep.id, p_reason: reason });
        if (error) throw error;
        alert('Rechazado');
      }
      location.href = 'admin.html?tab=deposits';
    }catch(e){
      alert(e.message || String(e));
    }
  }

  init();
})();