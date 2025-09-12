// Álbumes (crear, listar propios, desbloquear)
window.ALBUMS = (function(){
  const API = {
    async mine(){
      const r = await fetch('/api/albums/mine', {
        headers: { 'x-user-id': localStorage.getItem('userId') }
      });
      return r.json();
    },
    async create({ name, visibility, password }){
      const r = await fetch('/api/albums', {
        method:'POST',
        headers: { 'Content-Type':'application/json', 'x-user-id': localStorage.getItem('userId') },
        body: JSON.stringify({ name, visibility, password })
      });
      return r.json();
    },
    async unlock({ albumId, password }){
      const r = await fetch(`/api/albums/${albumId}/unlock`, {
        method:'POST',
        headers: { 'Content-Type':'application/json', 'x-user-id': localStorage.getItem('userId') },
        body: JSON.stringify({ password })
      });
      return r.json();
    }
  };

  async function refreshMine(){
    const j = await API.mine();
    const box = document.getElementById('my-albums');
    box.innerHTML = (j.albums||[]).map(a => `
      <div class="row">
        <strong>${a.name}</strong>
        <span class="tag">${a.visibility}</span>
        <button data-open-album="${a.id}">Abrir</button>
      </div>
    `).join('') || '<div class="muted">Sin álbumes.</div>';

    box.querySelectorAll('[data-open-album]')?.forEach(el=>el.addEventListener('click', async (e)=>{
      const albumId = e.currentTarget.getAttribute('data-open-album');
      // Guarda selección actual
      localStorage.setItem('currentAlbumId', albumId);
      // Trigger tu carga de lista con ownerId = mi userId y albumId
      if (window.loadListForAlbum) window.loadListForAlbum({ ownerId: localStorage.getItem('userId'), albumId });
      document.getElementById('modal-albums').classList.add('hidden');
    }));
  }

  function bind(){
    document.getElementById('btnCreateAlbum')?.addEventListener('click', async ()=>{
      const name = document.getElementById('album-name').value.trim();
      const visibility = document.getElementById('album-visibility').value;
      const password = document.getElementById('album-pass').value.trim();
      const j = await API.create({ name, visibility, password });
      if (j.error) alert('Error: '+j.error);
      await refreshMine();
    });
    document.querySelectorAll('#modal-albums [data-close]')?.forEach(el=>el.addEventListener('click', ()=>{
      document.getElementById('modal-albums').classList.add('hidden');
    }));
  }

  return { bind, refreshMine, API };
})();
