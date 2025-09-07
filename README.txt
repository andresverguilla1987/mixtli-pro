# Mixtli — Auth Proto (Registro real o Demo)
Generado: 2025-09-07 02:58

Este paquete te da **registro/inicio de sesión** y un **dashboard** básico con dos modos:
1) **Modo REAL (Supabase)** → Registro e inicio reales (email+password) usando Supabase Auth.
2) **Modo DEMO (localStorage)** → Para ver la interfaz sin backend.

## Cómo publicar
- Netlify / Vercel (Static) / cualquier hosting estático → arrastra el ZIP o carpeta.
- No requiere build.

## 0) Configurar el modo en `assets/config.js`
```js
window.CONFIG = {{
  mode: "demo", // "demo" o "supabase"
  supabaseUrl: "", // p.ej. https://xxxx.supabase.co
  supabaseAnonKey: "" // tu anon key
}}
```
> **Demo** funciona sin nada extra. Para **real**, crea un proyecto en Supabase y pon URL + anon key aquí.

## 1) Supabase (modo REAL) — Pasos
1. Crea proyecto en supabase.com → copia **Project URL** y **anon key** (Settings → API).
2. (Opcional dev) En **Auth → Email** desactiva *Confirmación por correo* para que el login funcione inmediato.
3. Edita `assets/config.js` y pon `mode: "supabase"`, y tus claves.
4. Sube el sitio (Netlify/Vercel). Abre `auth.html` → Regístrate → te llevará a `dashboard.html` con sesión.

## 2) Demo (sin backend) — Pasos
- Deja `mode: "demo"` en `assets/config.js`.
- Regístrate en `auth.html` (guarda en localStorage) → entra directo al dashboard.

## Seguridad
- En modo real, el **anon key** de Supabase se puede exponer en cliente (es público). Controla accesos con Row Level Security (RLS) si usas DB.
