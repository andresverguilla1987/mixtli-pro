// Familias (crear, invitar, listar)
window.FAMILY = (function(){
  const API = {
    async create(name){
      const r = await fetch('/api/family/create', {
        method:'POST',
        headers: { 'Content-Type':'application/json', 'x-user-id': localStorage.getItem('userId') },
        body: JSON.stringify({ name })
      });
      return r.json();
    },
    async invite(email){
      const r = await fetch('/api/family/invite', {
        method:'POST',
        headers: { 'Content-Type':'application/json', 'x-user-id': localStorage.getItem('userId') },
        body: JSON.stringify({ email })
      });
      return r.json();
    },
    async members(){
      const r = await fetch('/api/family/members', {
        headers: { 'x-user-id': localStorage.getItem('userId') }
      });
      return r.json();
    }
  };

  async function refreshMembers(){
    const box = document.getElementById('family-members');
    const j = await API.members();
    box.textContent = (j.members||[]).map(m => `${m.email} (${m.role})`).join(', ') || 'Sin miembros';
  }

  function bind(){
    const btnC = document.getElementById('btnCreateFamily');
    const btnI = document.getElementById('btnInvite');
    btnC?.addEventListener('click', async ()=>{
      const name = document.getElementById('family-name').value.trim() || 'Mixtli Familia';
      const j = await API.create(name);
      document.getElementById('family-status').textContent = j.error ? `Error: ${j.error}` : 'Familia creada';
      refreshMembers();
    });
    btnI?.addEventListener('click', async ()=>{
      const email = document.getElementById('invite-email').value.trim();
      if (!email) return;
      const j = await API.invite(email);
      document.getElementById('family-status').textContent = j.error ? `Error: ${j.error}` : `Invitación creada: ${j.inviteToken}`;
      refreshMembers();
    });
    document.querySelectorAll('#modal-family [data-close]')?.forEach(el=>el.addEventListener('click', ()=>{
      document.getElementById('modal-family').classList.add('hidden');
    }));
  }

  return { bind, refreshMembers };
})();
