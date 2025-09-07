# Mixtli — Auth + Storage con **Miniaturas**
Generado: 2025-09-07 03:14

Este paquete agrega **galería de miniaturas** al dashboard:
- Imágenes (`jpg,jpeg,png,gif,webp,svg`) se muestran como `<img>`.
- Videos (`mp4,webm,ogg`) con `<video>` mini.
- PDFs muestran ícono + botón **Previsualizar** (abre el signed URL).
- Otros: tarjeta con extensión + **Copiar link**.

## Configurar `assets/config.js`
```js
window.CONFIG = {
  mode: "supabase",                // "supabase" o "demo"
  supabaseUrl: "https://XXXX.supabase.co",
  supabaseAnonKey: "ey...",
  storageBucket: "files"
}
```

## Bucket y políticas (resumen)
- Bucket `files` (Private) y políticas por carpeta `<uid>/...` (ver README anterior que te pasé).

## Vista
- **Lista / Galería**: toggle arriba a la derecha.
- Cada tarjeta tiene: nombre, acciones (Copiar link / Borrar) y, si aplica, vista previa.
