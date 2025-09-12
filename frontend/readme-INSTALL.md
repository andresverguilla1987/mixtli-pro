# Instalación Frontend (Netlify) - Plan Familiar

1) **HTML**
   - Inserta los fragmentos en tu `index.html` (o vistas equivalentes):
     - `frontend/snippets/family-modal.html`
     - `frontend/snippets/albums-modal.html`
   - Añade botones en tu header/menú para abrir los modales:
     ```html
     <button onclick="document.getElementById('modal-family').classList.remove('hidden')">Familia</button>
     <button onclick="document.getElementById('modal-albums').classList.remove('hidden')">Álbumes</button>
     ```

2) **JS**
   - Incluye los scripts después de tu `app.js` principal:
     ```html
     <script src="/js/family.js"></script>
     <script src="/js/albums.js"></script>
     <script>
       // Inicializa módulos al cargar
       window.addEventListener('DOMContentLoaded', ()=>{
         FAMILY.bind(); FAMILY.refreshMembers();
         ALBUMS.bind(); ALBUMS.refreshMine();
       });

       // Hook para que tu lista use ownerId/albumId actuales
       window.loadListForAlbum = ({ ownerId, albumId }) => {
         // Aquí llama a tu /api/list con ?ownerId=&albumId=
         // y pasa header 'x-user-id': localStorage.userId
       };
     </script>
     ```

3) **Uploader**
   - Al subir, manda `ownerId = localStorage.userId` y `albumId = localStorage.currentAlbumId` hacia tu backend,
     para que éste construya el key con prefijo `familyId/userId/albumSlug/archivo`.
