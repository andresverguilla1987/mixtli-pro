# Mixtli — Auth + Storage (Supabase) — **Registro real y archivos recientes**
Generado: 2025-09-07 03:06

Este paquete activa **registro/login reales con Supabase Auth** y **subida/listado** de archivos en **Supabase Storage**.
También tiene modo **demo** (sin backend) por si quieres ver la UI rápido.

---

## 0) Configurar `assets/config.js`
```js
window.CONFIG = {
  mode: "supabase",                 // "supabase" o "demo"
  supabaseUrl: "https://XXXX.supabase.co",
  supabaseAnonKey: "ey...tu_anon_key...",
  storageBucket: "files"            // bucket ya creado en Supabase Storage
}
```
> En **modo demo** NO sube a la nube; solo simula y guarda la lista en localStorage.

---

## 1) Supabase — Storage (una sola vez)
1. En tu proyecto Supabase → **Storage → Create new bucket** → nombre: `files` (recomendado), **Private**.
2. Ve a **SQL** y ejecuta estas **políticas** para acceso por carpeta del usuario (usa su UID como prefijo):
```sql
alter table storage.objects enable row level security;

-- Insertar solo en su propia carpeta: files/<uid>/...
create policy "obj_insert_own_folder" on storage.objects
for insert to authenticated
with check (
  bucket_id = 'files'
  and split_part(name, '/', 1) = auth.uid()::text
);

-- Listar/leer solo su carpeta
create policy "obj_select_own_folder" on storage.objects
for select to authenticated
using (
  bucket_id = 'files'
  and split_part(name, '/', 1) = auth.uid()::text
);

-- (Opcional) borrar solo su carpeta
create policy "obj_delete_own_folder" on storage.objects
for delete to authenticated
using (
  bucket_id = 'files'
  and split_part(name, '/', 1) = auth.uid()::text
);
```
> Si prefieres algo rápido para demo, puedes crear el bucket como **Public** y omitir políticas (no recomendado en producción).

---

## 2) Publicar (Netlify / Vercel static / cualquier hosting)
- Sube **este ZIP** tal cual (no requiere build). Abre `index.html` → `auth.html` y regístrate.
- Tras login te manda a `dashboard.html`. Ahí puedes **subir** y ver al instante **tus archivos**.

---

## 3) Notas
- Los enlaces se generan con **signed URLs** (caducidad 1h). Se copian al portapapeles con un clic.
- El path que usamos es `files/<UID>/<timestamp>_<filename>` para evitar colisiones y mantener orden.
