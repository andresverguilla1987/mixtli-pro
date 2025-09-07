# Mixtli — **V5** Carpetas + Compartir con expiración + Tags + Portada de Álbum
Generado: 2025-09-07 03:54

## Novedades
- **Carpetas** reales (árbol lateral) con crear, renombrar y **mover** archivos (arrastrar/soltar o acción "Mover").
- **Compartir con expiración**: genera links firmados de {"15 min", "1 h", "24 h", "7 días"} por **archivo** o **álbum**.
- **Tags** por archivo (chips), filtro por tag, búsqueda + orden, selección múltiple.
- **Portada de Álbum**: elige cover manual o usa la primera imagen.
- Mantiene todo lo pro de V4: miniaturas, lightbox con prev/next/zoom, álbumes/colecciones, acciones masivas.

---
## SQL para Supabase (agrega a lo previo de V4)

```sql
-- Álbum: agregar portada
alter table if exists public.albums add column if not exists cover_path text;

-- Tags por archivo
create table if not exists public.file_tags (
  user_id uuid not null,
  path text not null,   -- <uid>/carpeta/archivo.ext
  tag text not null,
  created_at timestamptz default now(),
  primary key (user_id, path, tag)
);

alter table public.file_tags enable row level security;
create policy "tags_self_access" on public.file_tags
for all to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());
```

> Nota: Las **carpetas** se representan por prefijos en Storage. No necesitas tabla para carpetas.

---
## Configuración (`assets/config.js`)
```js
window.CONFIG = {
  mode: "demo",                    // "demo" o "supabase"
  supabaseUrl: "",                 // https://XXXX.supabase.co
  supabaseAnonKey: "",             // tu anon key
  storageBucket: "files"           // bucket de Storage
}
```

## Consejos
- Para mover una carpeta completa en Supabase, el cliente hará *move* archivo por archivo (limitado por API).
- En **demo**, todo vive en localStorage y URLs tipo `blob:` para previews.
- Usa `start_server.bat` para abrir `http://localhost:5500` con doble clic.


IMPORTANTE:
- Abre siempre con http://localhost:5500 (no con file://) para evitar bloqueos del navegador.
- En DEMO, desde V5.1 guardamos los archivos como data URL para que 'Abrir' funcione tras recargar (archivos muy grandes pueden no caber en localStorage).
