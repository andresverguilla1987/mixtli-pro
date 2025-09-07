# Mixtli — Auth + Storage **V4 Álbums/Collections**
Generado: 2025-09-07 03:44

## Lo nuevo
- **Álbumes / Colecciones** por usuario: crea, renombra, borra.
- **Añade/quita** archivos a un álbum (selección múltiple).
- **Filtra** por álbum (barrita izquierda) + todo lo de V3: miniaturas, lightbox, búsqueda, filtros, ordenar, acciones masivas.
- **Compartir álbum**: copia al portapapeles una lista de links firmados (1h) de todos los items del álbum.
- Funciona en **modo demo** (localStorage) o **Supabase real** (Auth + Storage + Postgres).

## Tablas Supabase (SQL)
Ejecuta en **SQL Editor** de tu proyecto:

```sql
-- Álbumes
create table if not exists public.albums (
  id uuid primary key,
  user_id uuid not null,
  name text not null,
  created_at timestamptz default now()
);

-- Items en álbum
create table if not exists public.album_items (
  album_id uuid not null references public.albums(id) on delete cascade,
  path text not null,        -- ruta en Storage (p.ej. <uid>/<timestamp>_file.png)
  name text not null,
  created_at timestamptz default now(),
  primary key (album_id, path)
);

-- RLS
alter table public.albums enable row level security;
alter table public.album_items enable row level security;

create policy "album_self_access" on public.albums
for all to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "album_items_self_access" on public.album_items
for all to authenticated
using (exists (select 1 from public.albums a where a.id = album_items.album_id and a.user_id = auth.uid()))
with check (exists (select 1 from public.albums a where a.id = album_items.album_id and a.user_id = auth.uid()));
```

> Nota: El cliente genera `id` con `crypto.randomUUID()` al crear un álbum.

## Configuración (`assets/config.js`)
```js
window.CONFIG = {
  mode: "demo",                    // "demo" o "supabase"
  supabaseUrl: "",                 // https://xxxx.supabase.co
  supabaseAnonKey: "",             // tu anon key
  storageBucket: "files"           // bucket de Storage
}
```

## Uso rápido
1) Demo: deja `mode: "demo"`, ejecuta `start_server.bat` y abre `http://localhost:5500`.
2) Real: crea bucket `files` (Private) + políticas por carpeta `<uid>/...` (de versiones previas) y ejecuta el SQL de arriba. Pon tus claves en `assets/config.js` y `mode: "supabase"`.
