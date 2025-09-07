# Mixtli — Auth + Storage **V3 Turbo** (miniaturas PRO + lightbox + filtros)
Generado: 2025-09-07 03:36

## Qué trae
- **Miniaturas PRO** (lista/galería) con hover bonito y control de tamaño.
- **Lightbox** con *prev/next/zoom/pan*, **descargar** y **copiar link**.
- **Filtros** por tipo (Imágenes / Videos / Docs / Otros) + **buscador** + **ordenar** (Recientes/Nombre).
- **Selección múltiple** con acciones: *Copiar links* y *Borrar*.
- **Tamaños**: intento de obtener tamaño real (HEAD) cuando hay Supabase (puede tardar; si CORS bloquea, se omite).
- **Demo mode** sin backend o **Supabase** real con Storage.

## Configuración (`assets/config.js`)
```js
window.CONFIG = {
  mode: "demo",                    // "demo" o "supabase"
  supabaseUrl: "",                 // https://xxxx.supabase.co
  supabaseAnonKey: "",             // tu anon key
  storageBucket: "files"           // bucket de Storage
}
```

## Server local (Windows)
- Doble clic en **start_server.bat** para abrir `http://localhost:5500`.
