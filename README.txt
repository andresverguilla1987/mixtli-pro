# Mixtli — Auth + Storage con **Lightbox** (miniaturas + vista previa modal)
Generado: 2025-09-07 03:25

Incluye:
- Registro/login real (Supabase) o modo demo sin backend.
- Subida a **Supabase Storage**.
- **Miniaturas** (lista/galería) y **LIGHTBOX** con: abrir al clic, **siguiente/anterior**, **zoom** (rueda o botones), **arrastrar para panear**, **ESC** para cerrar, **←/→** para navegar.

## Configurar `assets/config.js`
```js
window.CONFIG = {
  mode: "supabase",                // "supabase" o "demo"
  supabaseUrl: "https://XXXX.supabase.co",
  supabaseAnonKey: "ey...",
  storageBucket: "files"
}
```

## Notas
- Para demo, usa `mode: "demo"` y verás la UI con miniaturas y lightbox sin backend.
- Para producción, crea bucket `files` (Private) y aplica políticas por carpeta `<uid>/...`.
